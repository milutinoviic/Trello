import { ChangeDetectorRef, Component, ElementRef, HostListener, QueryList, Renderer2, ViewChild, ViewChildren, Output, EventEmitter } from '@angular/core';
import { Utils } from 'ngx-bootstrap/utils';
import { PositioningService } from 'ngx-bootstrap/positioning';
import { Subscription } from 'rxjs';
import { latinize } from './typeahead-utils';
import { typeaheadAnimation } from './typeahead-animations';
import { NgTemplateOutlet, NgFor, NgIf } from '@angular/common';
import * as i0 from "@angular/core";
import * as i1 from "ngx-bootstrap/positioning";
let nextWindowId = 0;
export class TypeaheadContainerComponent {
    get typeaheadTemplateMethods() {
        return {
            selectMatch: this.selectMatch.bind(this),
            selectActive: this.selectActive.bind(this),
            isActive: this.isActive.bind(this)
        };
    }
    constructor(positionService, renderer, element, changeDetectorRef) {
        this.positionService = positionService;
        this.renderer = renderer;
        this.element = element;
        this.changeDetectorRef = changeDetectorRef;
        // eslint-disable-next-line @angular-eslint/no-output-rename
        this.activeChangeEvent = new EventEmitter();
        this.isFocused = false;
        this.positionServiceSubscription = new Subscription();
        this.height = 0;
        this.popupId = `ngb-typeahead-${nextWindowId++}`;
        this._matches = [];
        this.renderer.setAttribute(this.element.nativeElement, 'id', this.popupId);
        this.positionServiceSubscription.add(this.positionService.event$?.subscribe(() => {
            if (this.isAnimated) {
                this.animationState = this.isTopPosition ? 'animated-up' : 'animated-down';
                this.changeDetectorRef.detectChanges();
                return;
            }
            this.animationState = 'unanimated';
            this.changeDetectorRef.detectChanges();
        }));
    }
    get active() {
        return this._active;
    }
    set active(active) {
        this._active = active;
        this.activeChanged();
    }
    get matches() {
        return this._matches;
    }
    set matches(value) {
        this.positionService.setOptions({
            modifiers: { flip: { enabled: this.adaptivePosition } },
            allowedPositions: ['top', 'bottom']
        });
        this._matches = value;
        this.needScrollbar = this.typeaheadScrollable && this.typeaheadOptionsInScrollableView < this.matches.length;
        if (this.typeaheadScrollable) {
            setTimeout(() => {
                this.setScrollableMode();
            });
        }
        if (this.typeaheadIsFirstItemActive && this._matches.length > 0) {
            this.setActive(this._matches[0]);
            if (this._active?.isHeader()) {
                this.nextActiveMatch();
            }
        }
        if (this._active && !this.typeaheadIsFirstItemActive) {
            const concurrency = this._matches.find(match => match.value === this._active?.value);
            if (concurrency) {
                this.selectActive(concurrency);
                return;
            }
            this.active = void 0;
        }
    }
    get isTopPosition() {
        return this.element.nativeElement.classList.contains('top');
    }
    get optionsListTemplate() {
        return this.parent ? this.parent.optionsListTemplate : undefined;
    }
    get isAnimated() {
        return this.parent ? this.parent.isAnimated : false;
    }
    get adaptivePosition() {
        return this.parent ? this.parent.adaptivePosition : false;
    }
    get typeaheadScrollable() {
        return this.parent ? this.parent.typeaheadScrollable : false;
    }
    get typeaheadOptionsInScrollableView() {
        return this.parent ? this.parent.typeaheadOptionsInScrollableView : 5;
    }
    get typeaheadIsFirstItemActive() {
        return this.parent ? this.parent.typeaheadIsFirstItemActive : true;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get itemTemplate() {
        return this.parent ? this.parent.typeaheadItemTemplate : undefined;
    }
    get canSelectItemsOnBlur() {
        return !!this.parent?.selectItemOnBlur;
    }
    selectActiveMatch(isActiveItemChanged) {
        if (this._active && this.parent?.typeaheadSelectFirstItem) {
            this.selectMatch(this._active);
        }
        if (!this.parent?.typeaheadSelectFirstItem && isActiveItemChanged) {
            this.selectMatch(this._active);
        }
    }
    activeChanged() {
        if (!this._active) {
            return;
        }
        const index = this.matches.indexOf(this._active);
        this.activeChangeEvent.emit(`${this.popupId}-${index}`);
    }
    prevActiveMatch() {
        if (!this._active) {
            return;
        }
        const index = this.matches.indexOf(this._active);
        this.setActive(this.matches[index - 1 < 0 ? this.matches.length - 1 : index - 1]);
        if (this._active.isHeader()) {
            this.prevActiveMatch();
        }
        if (this.typeaheadScrollable) {
            this.scrollPrevious(index);
        }
    }
    nextActiveMatch() {
        const index = this._active ? this.matches.indexOf(this._active) : -1;
        this.setActive(this.matches[index + 1 > this.matches.length - 1 ? 0 : index + 1]);
        if (this._active?.isHeader()) {
            this.nextActiveMatch();
        }
        if (this.typeaheadScrollable) {
            this.scrollNext(index);
        }
    }
    selectActive(value) {
        this.isFocused = true;
        this.setActive(value);
    }
    highlight(match, query) {
        let itemStr = match.value;
        let itemStrHelper = (this.parent && this.parent.typeaheadLatinize
            ? latinize(itemStr)
            : itemStr).toLowerCase();
        let startIdx;
        let tokenLen;
        // Replaces the capture string with the same string inside of a "strong" tag
        if (typeof query === 'object') {
            const queryLen = query.length;
            for (let i = 0; i < queryLen; i += 1) {
                // query[i] is already latinized and lower case
                startIdx = itemStrHelper.indexOf(query[i]);
                tokenLen = query[i].length;
                if (startIdx >= 0 && tokenLen > 0) {
                    itemStr =
                        `${itemStr.substring(0, startIdx)}<strong>${itemStr.substring(startIdx, startIdx + tokenLen)}</strong>` +
                            `${itemStr.substring(startIdx + tokenLen)}`;
                    itemStrHelper =
                        `${itemStrHelper.substring(0, startIdx)}????????${'??'.repeat(tokenLen)}??????????` +
                            `${itemStrHelper.substring(startIdx + tokenLen)}`;
                }
            }
        }
        else if (query) {
            // query is already latinized and lower case
            startIdx = itemStrHelper.indexOf(query);
            tokenLen = query.length;
            if (startIdx >= 0 && tokenLen > 0) {
                itemStr =
                    `${itemStr.substring(0, startIdx)}<strong>${itemStr.substring(startIdx, startIdx + tokenLen)}</strong>` +
                        `${itemStr.substring(startIdx + tokenLen)}`;
            }
        }
        return itemStr;
    }
    focusLost() {
        this.isFocused = false;
        if (!this.canSelectItemsOnBlur) {
            this.setActive(void 0);
        }
    }
    isActive(value) {
        return this.active === value;
    }
    selectMatch(value, event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        this.parent?.changeModel(value);
        setTimeout(() => this.parent?.typeaheadOnSelect.emit(value), 0);
        return false;
    }
    setScrollableMode() {
        if (!this.ulElement) {
            this.ulElement = this.element;
        }
        if (this.liElements?.first) {
            const ulStyles = Utils.getStyles(this.ulElement.nativeElement);
            const liStyles = Utils.getStyles(this.liElements.first.nativeElement);
            const ulPaddingBottom = parseFloat((ulStyles['padding-bottom'] ? ulStyles['padding-bottom'] : '')
                .replace('px', ''));
            const ulPaddingTop = parseFloat((ulStyles['padding-top'] ? ulStyles['padding-top'] : '0')
                .replace('px', ''));
            const optionHeight = parseFloat((liStyles.height ? liStyles.height : '0')
                .replace('px', ''));
            const height = this.typeaheadOptionsInScrollableView * optionHeight;
            this.guiHeight = `${height + ulPaddingTop + ulPaddingBottom}px`;
        }
        this.renderer.setStyle(this.element.nativeElement, 'visibility', 'visible');
    }
    scrollPrevious(index) {
        if (index === 0) {
            this.scrollToBottom();
            return;
        }
        if (this.liElements && this.ulElement) {
            const liElement = this.liElements.toArray()[index - 1];
            if (liElement && !this.isScrolledIntoView(liElement.nativeElement)) {
                this.ulElement.nativeElement.scrollTop = liElement.nativeElement.offsetTop;
            }
        }
    }
    scrollNext(index) {
        if (index + 1 > this.matches.length - 1) {
            this.scrollToTop();
            return;
        }
        if (this.liElements && this.ulElement) {
            const liElement = this.liElements.toArray()[index + 1];
            if (liElement && !this.isScrolledIntoView(liElement.nativeElement)) {
                this.ulElement.nativeElement.scrollTop =
                    liElement.nativeElement.offsetTop -
                        Number(this.ulElement.nativeElement.offsetHeight) +
                        Number(liElement.nativeElement.offsetHeight);
            }
        }
    }
    ngOnDestroy() {
        this.positionServiceSubscription.unsubscribe();
    }
    setActive(value) {
        this._active = value;
        let preview;
        if (!(this._active == null || this._active.isHeader())) {
            preview = value;
        }
        this.parent?.typeaheadOnPreview.emit(preview);
    }
    isScrolledIntoView(elem) {
        if (!this.ulElement) {
            return false;
        }
        const containerViewTop = this.ulElement.nativeElement.scrollTop;
        const containerViewBottom = containerViewTop + Number(this.ulElement.nativeElement.offsetHeight);
        const elemTop = elem.offsetTop;
        const elemBottom = elemTop + elem.offsetHeight;
        return ((elemBottom <= containerViewBottom) && (elemTop >= containerViewTop));
    }
    scrollToBottom() {
        if (!this.ulElement?.nativeElement) {
            return;
        }
        this.ulElement.nativeElement.scrollTop = this.ulElement.nativeElement.scrollHeight;
    }
    scrollToTop() {
        if (!this.ulElement?.nativeElement) {
            return;
        }
        this.ulElement.nativeElement.scrollTop = 0;
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: TypeaheadContainerComponent, deps: [{ token: i1.PositioningService }, { token: i0.Renderer2 }, { token: i0.ElementRef }, { token: i0.ChangeDetectorRef }], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "18.0.1", type: TypeaheadContainerComponent, isStandalone: true, selector: "typeahead-container", outputs: { activeChangeEvent: "activeChange" }, host: { listeners: { "mouseleave": "focusLost()", "blur": "focusLost()" }, properties: { "style.height": "needScrollbar ? guiHeight: 'auto'", "style.visibility": "'inherit'", "class.dropup": "dropup", "attr.role": "'listbox'" }, styleAttribute: "position: absolute;display: block;", classAttribute: "dropdown open bottom dropdown-menu" }, providers: [PositioningService], viewQueries: [{ propertyName: "ulElement", first: true, predicate: ["ulElement"], descendants: true }, { propertyName: "liElements", predicate: ["liElements"], descendants: true }], ngImport: i0, template: "<!-- inject options list template -->\n<ng-template [ngTemplateOutlet]=\"optionsListTemplate || bs4Template\"\n             [ngTemplateOutletContext]=\"{\n               matches: matches,\n               itemTemplate: itemTemplate || bsItemTemplate,\n               query: query,\n               $implicit: typeaheadTemplateMethods\n             }\">\n</ng-template>\n\n<!-- default options item template -->\n<ng-template #bsItemTemplate let-match=\"match\" let-query=\"query\">\n  <span [innerHtml]=\"highlight(match, query)\"></span>\n</ng-template>\n\n<!-- Bootstrap 4 options list template -->\n<ng-template #bs4Template>\n  <ng-template ngFor let-match let-i=\"index\" [ngForOf]=\"matches\">\n    <h6 *ngIf=\"match.isHeader()\" class=\"dropdown-header\">{{ match }}</h6>\n    <ng-template [ngIf]=\"!match.isHeader()\">\n      <button #liElements\n              [id]=\"popupId + '-' + i\"\n              role=\"option\"\n              [@typeaheadAnimation]=\"animationState\"\n              class=\"dropdown-item\"\n              (click)=\"selectMatch(match, $event)\"\n              (mouseenter)=\"selectActive(match)\"\n              [class.active]=\"isActive(match)\">\n        <ng-template [ngTemplateOutlet]=\"itemTemplate || bsItemTemplate\"\n                     [ngTemplateOutletContext]=\"{item: match.item, index: i, match: match, query: query}\">\n        </ng-template>\n      </button>\n    </ng-template>\n  </ng-template>\n</ng-template>\n", styles: [":host.dropdown{z-index:1000}:host.dropdown-menu,.dropdown-menu{overflow-y:auto;height:100px}\n"], dependencies: [{ kind: "directive", type: NgTemplateOutlet, selector: "[ngTemplateOutlet]", inputs: ["ngTemplateOutletContext", "ngTemplateOutlet", "ngTemplateOutletInjector"] }, { kind: "directive", type: NgFor, selector: "[ngFor][ngForOf]", inputs: ["ngForOf", "ngForTrackBy", "ngForTemplate"] }, { kind: "directive", type: NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }], animations: [typeaheadAnimation] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: TypeaheadContainerComponent, decorators: [{
            type: Component,
            args: [{ selector: 'typeahead-container', host: {
                        class: 'dropdown open bottom dropdown-menu',
                        '[style.height]': `needScrollbar ? guiHeight: 'auto'`,
                        '[style.visibility]': `'inherit'`,
                        '[class.dropup]': 'dropup',
                        style: 'position: absolute;display: block;',
                        '[attr.role]': `'listbox'`
                    }, animations: [typeaheadAnimation], standalone: true, imports: [NgTemplateOutlet, NgFor, NgIf], providers: [PositioningService], template: "<!-- inject options list template -->\n<ng-template [ngTemplateOutlet]=\"optionsListTemplate || bs4Template\"\n             [ngTemplateOutletContext]=\"{\n               matches: matches,\n               itemTemplate: itemTemplate || bsItemTemplate,\n               query: query,\n               $implicit: typeaheadTemplateMethods\n             }\">\n</ng-template>\n\n<!-- default options item template -->\n<ng-template #bsItemTemplate let-match=\"match\" let-query=\"query\">\n  <span [innerHtml]=\"highlight(match, query)\"></span>\n</ng-template>\n\n<!-- Bootstrap 4 options list template -->\n<ng-template #bs4Template>\n  <ng-template ngFor let-match let-i=\"index\" [ngForOf]=\"matches\">\n    <h6 *ngIf=\"match.isHeader()\" class=\"dropdown-header\">{{ match }}</h6>\n    <ng-template [ngIf]=\"!match.isHeader()\">\n      <button #liElements\n              [id]=\"popupId + '-' + i\"\n              role=\"option\"\n              [@typeaheadAnimation]=\"animationState\"\n              class=\"dropdown-item\"\n              (click)=\"selectMatch(match, $event)\"\n              (mouseenter)=\"selectActive(match)\"\n              [class.active]=\"isActive(match)\">\n        <ng-template [ngTemplateOutlet]=\"itemTemplate || bsItemTemplate\"\n                     [ngTemplateOutletContext]=\"{item: match.item, index: i, match: match, query: query}\">\n        </ng-template>\n      </button>\n    </ng-template>\n  </ng-template>\n</ng-template>\n", styles: [":host.dropdown{z-index:1000}:host.dropdown-menu,.dropdown-menu{overflow-y:auto;height:100px}\n"] }]
        }], ctorParameters: () => [{ type: i1.PositioningService }, { type: i0.Renderer2 }, { type: i0.ElementRef }, { type: i0.ChangeDetectorRef }], propDecorators: { activeChangeEvent: [{
                type: Output,
                args: ['activeChange']
            }], ulElement: [{
                type: ViewChild,
                args: ['ulElement', { static: false }]
            }], liElements: [{
                type: ViewChildren,
                args: ['liElements']
            }], focusLost: [{
                type: HostListener,
                args: ['mouseleave']
            }, {
                type: HostListener,
                args: ['blur']
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZWFoZWFkLWNvbnRhaW5lci5jb21wb25lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvdHlwZWFoZWFkL3R5cGVhaGVhZC1jb250YWluZXIuY29tcG9uZW50LnRzIiwiLi4vLi4vLi4vLi4vc3JjL3R5cGVhaGVhZC90eXBlYWhlYWQtY29udGFpbmVyLmNvbXBvbmVudC5odG1sIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFDTCxpQkFBaUIsRUFDakIsU0FBUyxFQUNULFVBQVUsRUFDVixZQUFZLEVBRVosU0FBUyxFQUNULFNBQVMsRUFFVCxTQUFTLEVBQ1QsWUFBWSxFQUNaLE1BQU0sRUFDTixZQUFZLEVBQ2IsTUFBTSxlQUFlLENBQUM7QUFFdkIsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzVDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFFcEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRzdDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBRTVELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0saUJBQWlCLENBQUM7OztBQUVoRSxJQUFJLFlBQVksR0FBRyxDQUFDLENBQUM7QUFnQ3JCLE1BQU0sT0FBTywyQkFBMkI7SUFtQnRDLElBQUksd0JBQXdCO1FBQzFCLE9BQU87WUFDTCxXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQ3hDLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDMUMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztT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Q0FBQyxhQUFhLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQztJQUM3QyxDQUFDOzhHQS9WVSwyQkFBMkI7a0dBQTNCLDJCQUEyQixxY0FIekIsQ0FBQyxrQkFBa0IsQ0FBQyxnTkN2RG5DLHE3Q0FtQ0Esd0pEbUJjLGdCQUFnQixvSkFBRSxLQUFLLG1IQUFFLElBQUksK0VBRjNCLENBQUMsa0JBQWtCLENBQUM7OzJGQU12QiwyQkFBMkI7a0JBOUJ2QyxTQUFTOytCQUNJLHFCQUFxQixRQUd6Qjt3QkFDRixLQUFLLEVBQUUsb0NBQW9DO3dCQUMzQyxnQkFBZ0IsRUFBRSxtQ0FBbUM7d0JBQ3JELG9CQUFvQixFQUFFLFdBQVc7d0JBQ2pDLGdCQUFnQixFQUFFLFFBQVE7d0JBQzFCLEtBQUssRUFBRSxvQ0FBb0M7d0JBQzNDLGFBQWEsRUFBRSxXQUFXO3FCQUM3QixjQWFXLENBQUMsa0JBQWtCLENBQUMsY0FDcEIsSUFBSSxXQUNQLENBQUMsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxhQUM3QixDQUFDLGtCQUFrQixDQUFDO3dLQUtULGlCQUFpQjtzQkFBeEMsTUFBTTt1QkFBQyxjQUFjO2dCQTZCZCxTQUFTO3NCQURoQixTQUFTO3VCQUFDLFdBQVcsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUU7Z0JBSWpDLFVBQVU7c0JBRGpCLFlBQVk7dUJBQUMsWUFBWTtnQkErTTFCLFNBQVM7c0JBRlIsWUFBWTt1QkFBQyxZQUFZOztzQkFDekIsWUFBWTt1QkFBQyxNQUFNIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgQ2hhbmdlRGV0ZWN0b3JSZWYsXG4gIENvbXBvbmVudCxcbiAgRWxlbWVudFJlZixcbiAgSG9zdExpc3RlbmVyLFxuICBPbkRlc3Ryb3ksXG4gIFF1ZXJ5TGlzdCxcbiAgUmVuZGVyZXIyLFxuICBUZW1wbGF0ZVJlZixcbiAgVmlld0NoaWxkLFxuICBWaWV3Q2hpbGRyZW4sXG4gIE91dHB1dCxcbiAgRXZlbnRFbWl0dGVyXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQgeyBVdGlscyB9IGZyb20gJ25neC1ib290c3RyYXAvdXRpbHMnO1xuaW1wb3J0IHsgUG9zaXRpb25pbmdTZXJ2aWNlIH0gZnJvbSAnbmd4LWJvb3RzdHJhcC9wb3NpdGlvbmluZyc7XG5pbXBvcnQgeyBTdWJzY3JpcHRpb24gfSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHsgbGF0aW5pemUgfSBmcm9tICcuL3R5cGVhaGVhZC11dGlscyc7XG5pbXBvcnQgeyBUeXBlYWhlYWRNYXRjaCB9IGZyb20gJy4vdHlwZWFoZWFkLW1hdGNoLmNsYXNzJztcbmltcG9ydCB7IFR5cGVhaGVhZERpcmVjdGl2ZSB9IGZyb20gJy4vdHlwZWFoZWFkLmRpcmVjdGl2ZSc7XG5pbXBvcnQgeyB0eXBlYWhlYWRBbmltYXRpb24gfSBmcm9tICcuL3R5cGVhaGVhZC1hbmltYXRpb25zJztcbmltcG9ydCB7IFR5cGVhaGVhZE9wdGlvbkl0ZW1Db250ZXh0LCBUeXBlYWhlYWRPcHRpb25MaXN0Q29udGV4dCwgVHlwZWFoZWFkVGVtcGxhdGVNZXRob2RzIH0gZnJvbSAnLi9tb2RlbHMnO1xuaW1wb3J0IHsgTmdUZW1wbGF0ZU91dGxldCwgTmdGb3IsIE5nSWYgfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuXG5sZXQgbmV4dFdpbmRvd0lkID0gMDtcblxuQENvbXBvbmVudCh7XG4gICAgc2VsZWN0b3I6ICd0eXBlYWhlYWQtY29udGFpbmVyJyxcbiAgICB0ZW1wbGF0ZVVybDogJy4vdHlwZWFoZWFkLWNvbnRhaW5lci5jb21wb25lbnQuaHRtbCcsXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEBhbmd1bGFyLWVzbGludC9uby1ob3N0LW1ldGFkYXRhLXByb3BlcnR5XG4gICAgaG9zdDoge1xuICAgICAgICBjbGFzczogJ2Ryb3Bkb3duIG9wZW4gYm90dG9tIGRyb3Bkb3duLW1lbnUnLFxuICAgICAgICAnW3N0eWxlLmhlaWdodF0nOiBgbmVlZFNjcm9sbGJhciA/IGd1aUhlaWdodDogJ2F1dG8nYCxcbiAgICAgICAgJ1tzdHlsZS52aXNpYmlsaXR5XSc6IGAnaW5oZXJpdCdgLFxuICAgICAgICAnW2NsYXNzLmRyb3B1cF0nOiAnZHJvcHVwJyxcbiAgICAgICAgc3R5bGU6ICdwb3NpdGlvbjogYWJzb2x1dGU7ZGlzcGxheTogYmxvY2s7JyxcbiAgICAgICAgJ1thdHRyLnJvbGVdJzogYCdsaXN0Ym94J2BcbiAgICB9LFxuICAgIHN0eWxlczogW1xuICAgICAgICBgXG4gICAgOmhvc3QuZHJvcGRvd24ge1xuICAgICAgei1pbmRleDogMTAwMDtcbiAgICB9XG5cbiAgICA6aG9zdC5kcm9wZG93bi1tZW51LCAuZHJvcGRvd24tbWVudSB7XG4gICAgICBvdmVyZmxvdy15OiBhdXRvO1xuICAgICAgaGVpZ2h0OiAxMDBweDtcbiAgICB9XG4gIGBcbiAgICBdLFxuICAgIGFuaW1hdGlvbnM6IFt0eXBlYWhlYWRBbmltYXRpb25dLFxuICAgIHN0YW5kYWxvbmU6IHRydWUsXG4gICAgaW1wb3J0czogW05nVGVtcGxhdGVPdXRsZXQsIE5nRm9yLCBOZ0lmXSxcbiAgICBwcm92aWRlcnM6IFtQb3NpdGlvbmluZ1NlcnZpY2VdXG59KVxuXG5leHBvcnQgY2xhc3MgVHlwZWFoZWFkQ29udGFpbmVyQ29tcG9uZW50IGltcGxlbWVudHMgT25EZXN0cm95IHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEBhbmd1bGFyLWVzbGludC9uby1vdXRwdXQtcmVuYW1lXG4gIEBPdXRwdXQoJ2FjdGl2ZUNoYW5nZScpIGFjdGl2ZUNoYW5nZUV2ZW50ID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuXG4gIHBhcmVudD86IFR5cGVhaGVhZERpcmVjdGl2ZTtcbiAgcXVlcnk/OiBzdHJpbmdbXSB8IHN0cmluZztcbiAgaXNGb2N1c2VkID0gZmFsc2U7XG4gIHRvcD86IHN0cmluZztcbiAgbGVmdD86IHN0cmluZztcbiAgZGlzcGxheT86IHN0cmluZztcbiAgcGxhY2VtZW4/OiBzdHJpbmc7XG4gIGRyb3B1cD86IGJvb2xlYW47XG4gIGd1aUhlaWdodD86IHN0cmluZztcbiAgbmVlZFNjcm9sbGJhcj86IGJvb2xlYW47XG4gIGFuaW1hdGlvblN0YXRlPzogc3RyaW5nO1xuICBwb3NpdGlvblNlcnZpY2VTdWJzY3JpcHRpb24gPSBuZXcgU3Vic2NyaXB0aW9uKCk7XG4gIGhlaWdodCA9IDA7XG4gIHBvcHVwSWQgPSBgbmdiLXR5cGVhaGVhZC0ke25leHRXaW5kb3dJZCsrfWA7XG5cbiAgZ2V0IHR5cGVhaGVhZFRlbXBsYXRlTWV0aG9kcygpOiBUeXBlYWhlYWRUZW1wbGF0ZU1ldGhvZHMge1xuICAgIHJldHVybiB7XG4gICAgICBzZWxlY3RNYXRjaDogdGhpcy5zZWxlY3RNYXRjaC5iaW5kKHRoaXMpLFxuICAgICAgc2VsZWN0QWN0aXZlOiB0aGlzLnNlbGVjdEFjdGl2ZS5iaW5kKHRoaXMpLFxuICAgICAgaXNBY3RpdmU6IHRoaXMuaXNBY3RpdmUuYmluZCh0aGlzKVxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgX2FjdGl2ZT86IFR5cGVhaGVhZE1hdGNoO1xuICBwcm90ZWN0ZWQgX21hdGNoZXM6IFR5cGVhaGVhZE1hdGNoW10gPSBbXTtcblxuICBAVmlld0NoaWxkKCd1bEVsZW1lbnQnLCB7IHN0YXRpYzogZmFsc2UgfSlcbiAgcHJpdmF0ZSB1bEVsZW1lbnQ/OiBFbGVtZW50UmVmO1xuXG4gIEBWaWV3Q2hpbGRyZW4oJ2xpRWxlbWVudHMnKVxuICBwcml2YXRlIGxpRWxlbWVudHM/OiBRdWVyeUxpc3Q8RWxlbWVudFJlZj47XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSBwb3NpdGlvblNlcnZpY2U6IFBvc2l0aW9uaW5nU2VydmljZSxcbiAgICBwcml2YXRlIHJlbmRlcmVyOiBSZW5kZXJlcjIsXG4gICAgcHVibGljIGVsZW1lbnQ6IEVsZW1lbnRSZWYsXG4gICAgcHJpdmF0ZSBjaGFuZ2VEZXRlY3RvclJlZjogQ2hhbmdlRGV0ZWN0b3JSZWZcbiAgKSB7XG4gICAgdGhpcy5yZW5kZXJlci5zZXRBdHRyaWJ1dGUodGhpcy5lbGVtZW50Lm5hdGl2ZUVsZW1lbnQsICdpZCcsIHRoaXMucG9wdXBJZCk7XG4gICAgdGhpcy5wb3NpdGlvblNlcnZpY2VTdWJzY3JpcHRpb24uYWRkKHRoaXMucG9zaXRpb25TZXJ2aWNlLmV2ZW50JD8uc3Vic2NyaWJlKFxuICAgICAgKCkgPT4ge1xuICAgICAgICBpZiAodGhpcy5pc0FuaW1hdGVkKSB7XG4gICAgICAgICAgdGhpcy5hbmltYXRpb25TdGF0ZSA9IHRoaXMuaXNUb3BQb3NpdGlvbiA/ICdhbmltYXRlZC11cCcgOiAnYW5pbWF0ZWQtZG93bic7XG4gICAgICAgICAgdGhpcy5jaGFuZ2VEZXRlY3RvclJlZi5kZXRlY3RDaGFuZ2VzKCk7XG5cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmFuaW1hdGlvblN0YXRlID0gJ3VuYW5pbWF0ZWQnO1xuICAgICAgICB0aGlzLmNoYW5nZURldGVjdG9yUmVmLmRldGVjdENoYW5nZXMoKTtcbiAgICAgIH1cbiAgICApKTtcbiAgfVxuXG4gIGdldCBhY3RpdmUoKTogVHlwZWFoZWFkTWF0Y2ggfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLl9hY3RpdmU7XG4gIH1cblxuICBzZXQgYWN0aXZlKGFjdGl2ZTogVHlwZWFoZWFkTWF0Y2ggfCB1bmRlZmluZWQpIHtcbiAgICB0aGlzLl9hY3RpdmUgPSBhY3RpdmU7XG4gICAgdGhpcy5hY3RpdmVDaGFuZ2VkKCk7XG4gIH1cblxuICBnZXQgbWF0Y2hlcygpOiBUeXBlYWhlYWRNYXRjaFtdIHtcbiAgICByZXR1cm4gdGhpcy5fbWF0Y2hlcztcbiAgfVxuXG4gIHNldCBtYXRjaGVzKHZhbHVlOiBUeXBlYWhlYWRNYXRjaFtdKSB7XG4gICAgdGhpcy5wb3NpdGlvblNlcnZpY2Uuc2V0T3B0aW9ucyh7XG4gICAgICBtb2RpZmllcnM6IHsgZmxpcDogeyBlbmFibGVkOiB0aGlzLmFkYXB0aXZlUG9zaXRpb24gfSB9LFxuICAgICAgYWxsb3dlZFBvc2l0aW9uczogWyd0b3AnLCAnYm90dG9tJ11cbiAgICB9KTtcblxuICAgIHRoaXMuX21hdGNoZXMgPSB2YWx1ZTtcblxuICAgIHRoaXMubmVlZFNjcm9sbGJhciA9IHRoaXMudHlwZWFoZWFkU2Nyb2xsYWJsZSAmJiB0aGlzLnR5cGVhaGVhZE9wdGlvbnNJblNjcm9sbGFibGVWaWV3IDwgdGhpcy5tYXRjaGVzLmxlbmd0aDtcblxuICAgIGlmICh0aGlzLnR5cGVhaGVhZFNjcm9sbGFibGUpIHtcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLnNldFNjcm9sbGFibGVNb2RlKCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy50eXBlYWhlYWRJc0ZpcnN0SXRlbUFjdGl2ZSAmJiB0aGlzLl9tYXRjaGVzLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMuc2V0QWN0aXZlKHRoaXMuX21hdGNoZXNbMF0pO1xuXG4gICAgICBpZiAodGhpcy5fYWN0aXZlPy5pc0hlYWRlcigpKSB7XG4gICAgICAgIHRoaXMubmV4dEFjdGl2ZU1hdGNoKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2FjdGl2ZSAmJiAhdGhpcy50eXBlYWhlYWRJc0ZpcnN0SXRlbUFjdGl2ZSkge1xuICAgICAgY29uc3QgY29uY3VycmVuY3kgPSB0aGlzLl9tYXRjaGVzLmZpbmQobWF0Y2ggPT4gbWF0Y2gudmFsdWUgPT09IHRoaXMuX2FjdGl2ZT8udmFsdWUpO1xuXG4gICAgICBpZiAoY29uY3VycmVuY3kpIHtcbiAgICAgICAgdGhpcy5zZWxlY3RBY3RpdmUoY29uY3VycmVuY3kpO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5hY3RpdmUgPSB2b2lkIDA7XG4gICAgfVxuICB9XG5cbiAgZ2V0IGlzVG9wUG9zaXRpb24oKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuZWxlbWVudC5uYXRpdmVFbGVtZW50LmNsYXNzTGlzdC5jb250YWlucygndG9wJyk7XG4gIH1cblxuICBnZXQgb3B0aW9uc0xpc3RUZW1wbGF0ZSgpOiBUZW1wbGF0ZVJlZjxUeXBlYWhlYWRPcHRpb25MaXN0Q29udGV4dD4gfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLnBhcmVudCA/IHRoaXMucGFyZW50Lm9wdGlvbnNMaXN0VGVtcGxhdGUgOiB1bmRlZmluZWQ7XG4gIH1cblxuICBnZXQgaXNBbmltYXRlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5wYXJlbnQgPyB0aGlzLnBhcmVudC5pc0FuaW1hdGVkIDogZmFsc2U7XG4gIH1cblxuICBnZXQgYWRhcHRpdmVQb3NpdGlvbigpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5wYXJlbnQgPyB0aGlzLnBhcmVudC5hZGFwdGl2ZVBvc2l0aW9uIDogZmFsc2U7XG4gIH1cblxuICBnZXQgdHlwZWFoZWFkU2Nyb2xsYWJsZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5wYXJlbnQgPyB0aGlzLnBhcmVudC50eXBlYWhlYWRTY3JvbGxhYmxlIDogZmFsc2U7XG4gIH1cblxuICBnZXQgdHlwZWFoZWFkT3B0aW9uc0luU2Nyb2xsYWJsZVZpZXcoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5wYXJlbnQgPyB0aGlzLnBhcmVudC50eXBlYWhlYWRPcHRpb25zSW5TY3JvbGxhYmxlVmlldyA6IDU7XG4gIH1cblxuICBnZXQgdHlwZWFoZWFkSXNGaXJzdEl0ZW1BY3RpdmUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMucGFyZW50ID8gdGhpcy5wYXJlbnQudHlwZWFoZWFkSXNGaXJzdEl0ZW1BY3RpdmUgOiB0cnVlO1xuICB9XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gIGdldCBpdGVtVGVtcGxhdGUoKTogVGVtcGxhdGVSZWY8VHlwZWFoZWFkT3B0aW9uSXRlbUNvbnRleHQ+IHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5wYXJlbnQgPyB0aGlzLnBhcmVudC50eXBlYWhlYWRJdGVtVGVtcGxhdGUgOiB1bmRlZmluZWQ7XG4gIH1cblxuICBnZXQgY2FuU2VsZWN0SXRlbXNPbkJsdXIoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhdGhpcy5wYXJlbnQ/LnNlbGVjdEl0ZW1PbkJsdXI7XG4gIH1cblxuICBzZWxlY3RBY3RpdmVNYXRjaChpc0FjdGl2ZUl0ZW1DaGFuZ2VkPzogYm9vbGVhbik6IHZvaWQge1xuICAgIGlmICh0aGlzLl9hY3RpdmUgJiYgdGhpcy5wYXJlbnQ/LnR5cGVhaGVhZFNlbGVjdEZpcnN0SXRlbSkge1xuICAgICAgdGhpcy5zZWxlY3RNYXRjaCh0aGlzLl9hY3RpdmUpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5wYXJlbnQ/LnR5cGVhaGVhZFNlbGVjdEZpcnN0SXRlbSAmJiBpc0FjdGl2ZUl0ZW1DaGFuZ2VkKSB7XG4gICAgICB0aGlzLnNlbGVjdE1hdGNoKHRoaXMuX2FjdGl2ZSk7XG4gICAgfVxuICB9XG5cbiAgYWN0aXZlQ2hhbmdlZCgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuX2FjdGl2ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBpbmRleCA9IHRoaXMubWF0Y2hlcy5pbmRleE9mKHRoaXMuX2FjdGl2ZSk7XG4gICAgdGhpcy5hY3RpdmVDaGFuZ2VFdmVudC5lbWl0KGAke3RoaXMucG9wdXBJZH0tJHtpbmRleH1gKTtcbiAgfVxuXG4gIHByZXZBY3RpdmVNYXRjaCgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuX2FjdGl2ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5tYXRjaGVzLmluZGV4T2YodGhpcy5fYWN0aXZlKTtcbiAgICB0aGlzLnNldEFjdGl2ZSh0aGlzLm1hdGNoZXNbXG4gICAgICBpbmRleCAtIDEgPCAwID8gdGhpcy5tYXRjaGVzLmxlbmd0aCAtIDEgOiBpbmRleCAtIDFcbiAgICAgIF0pO1xuXG4gICAgaWYgKHRoaXMuX2FjdGl2ZS5pc0hlYWRlcigpKSB7XG4gICAgICB0aGlzLnByZXZBY3RpdmVNYXRjaCgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnR5cGVhaGVhZFNjcm9sbGFibGUpIHtcbiAgICAgIHRoaXMuc2Nyb2xsUHJldmlvdXMoaW5kZXgpO1xuICAgIH1cbiAgfVxuXG4gIG5leHRBY3RpdmVNYXRjaCgpOiB2b2lkIHtcbiAgICBjb25zdCBpbmRleCA9IHRoaXMuX2FjdGl2ZSA/IHRoaXMubWF0Y2hlcy5pbmRleE9mKHRoaXMuX2FjdGl2ZSkgOiAtMTtcbiAgICB0aGlzLnNldEFjdGl2ZSh0aGlzLm1hdGNoZXNbXG4gICAgICBpbmRleCArIDEgPiB0aGlzLm1hdGNoZXMubGVuZ3RoIC0gMSA/IDAgOiBpbmRleCArIDFcbiAgICAgIF0pO1xuXG4gICAgaWYgKHRoaXMuX2FjdGl2ZT8uaXNIZWFkZXIoKSkge1xuICAgICAgdGhpcy5uZXh0QWN0aXZlTWF0Y2goKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy50eXBlYWhlYWRTY3JvbGxhYmxlKSB7XG4gICAgICB0aGlzLnNjcm9sbE5leHQoaW5kZXgpO1xuICAgIH1cbiAgfVxuXG4gIHNlbGVjdEFjdGl2ZSh2YWx1ZTogVHlwZWFoZWFkTWF0Y2gpOiB2b2lkIHtcbiAgICB0aGlzLmlzRm9jdXNlZCA9IHRydWU7XG4gICAgdGhpcy5zZXRBY3RpdmUodmFsdWUpO1xuICB9XG5cbiAgaGlnaGxpZ2h0KG1hdGNoOiBUeXBlYWhlYWRNYXRjaCwgcXVlcnk6IHN0cmluZ1tdIHwgc3RyaW5nKTogc3RyaW5nIHtcbiAgICBsZXQgaXRlbVN0cjogc3RyaW5nID0gbWF0Y2gudmFsdWU7XG4gICAgbGV0IGl0ZW1TdHJIZWxwZXI6IHN0cmluZyA9ICh0aGlzLnBhcmVudCAmJiB0aGlzLnBhcmVudC50eXBlYWhlYWRMYXRpbml6ZVxuICAgICAgPyBsYXRpbml6ZShpdGVtU3RyKVxuICAgICAgOiBpdGVtU3RyKS50b0xvd2VyQ2FzZSgpO1xuICAgIGxldCBzdGFydElkeDogbnVtYmVyO1xuICAgIGxldCB0b2tlbkxlbjogbnVtYmVyO1xuICAgIC8vIFJlcGxhY2VzIHRoZSBjYXB0dXJlIHN0cmluZyB3aXRoIHRoZSBzYW1lIHN0cmluZyBpbnNpZGUgb2YgYSBcInN0cm9uZ1wiIHRhZ1xuICAgIGlmICh0eXBlb2YgcXVlcnkgPT09ICdvYmplY3QnKSB7XG4gICAgICBjb25zdCBxdWVyeUxlbjogbnVtYmVyID0gcXVlcnkubGVuZ3RoO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBxdWVyeUxlbjsgaSArPSAxKSB7XG4gICAgICAgIC8vIHF1ZXJ5W2ldIGlzIGFscmVhZHkgbGF0aW5pemVkIGFuZCBsb3dlciBjYXNlXG4gICAgICAgIHN0YXJ0SWR4ID0gaXRlbVN0ckhlbHBlci5pbmRleE9mKHF1ZXJ5W2ldKTtcbiAgICAgICAgdG9rZW5MZW4gPSBxdWVyeVtpXS5sZW5ndGg7XG4gICAgICAgIGlmIChzdGFydElkeCA+PSAwICYmIHRva2VuTGVuID4gMCkge1xuICAgICAgICAgIGl0ZW1TdHIgPVxuICAgICAgICAgICAgYCR7aXRlbVN0ci5zdWJzdHJpbmcoMCwgc3RhcnRJZHgpfTxzdHJvbmc+JHtpdGVtU3RyLnN1YnN0cmluZyhzdGFydElkeCwgc3RhcnRJZHggKyB0b2tlbkxlbil9PC9zdHJvbmc+YCArXG4gICAgICAgICAgICBgJHtpdGVtU3RyLnN1YnN0cmluZyhzdGFydElkeCArIHRva2VuTGVuKX1gO1xuICAgICAgICAgIGl0ZW1TdHJIZWxwZXIgPVxuICAgICAgICAgICAgYCR7aXRlbVN0ckhlbHBlci5zdWJzdHJpbmcoMCwgc3RhcnRJZHgpfT8/Pz8/Pz8/JHsnPz8nLnJlcGVhdCh0b2tlbkxlbil9Pz8/Pz8/Pz8/P2AgK1xuICAgICAgICAgICAgYCR7aXRlbVN0ckhlbHBlci5zdWJzdHJpbmcoc3RhcnRJZHggKyB0b2tlbkxlbil9YDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocXVlcnkpIHtcbiAgICAgIC8vIHF1ZXJ5IGlzIGFscmVhZHkgbGF0aW5pemVkIGFuZCBsb3dlciBjYXNlXG4gICAgICBzdGFydElkeCA9IGl0ZW1TdHJIZWxwZXIuaW5kZXhPZihxdWVyeSk7XG4gICAgICB0b2tlbkxlbiA9IHF1ZXJ5Lmxlbmd0aDtcbiAgICAgIGlmIChzdGFydElkeCA+PSAwICYmIHRva2VuTGVuID4gMCkge1xuICAgICAgICBpdGVtU3RyID1cbiAgICAgICAgICBgJHtpdGVtU3RyLnN1YnN0cmluZygwLCBzdGFydElkeCl9PHN0cm9uZz4ke2l0ZW1TdHIuc3Vic3RyaW5nKHN0YXJ0SWR4LCBzdGFydElkeCArIHRva2VuTGVuKX08L3N0cm9uZz5gICtcbiAgICAgICAgICBgJHtpdGVtU3RyLnN1YnN0cmluZyhzdGFydElkeCArIHRva2VuTGVuKX1gO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBpdGVtU3RyO1xuICB9XG5cbiAgQEhvc3RMaXN0ZW5lcignbW91c2VsZWF2ZScpXG4gIEBIb3N0TGlzdGVuZXIoJ2JsdXInKVxuICBmb2N1c0xvc3QoKTogdm9pZCB7XG4gICAgdGhpcy5pc0ZvY3VzZWQgPSBmYWxzZTtcbiAgICBpZiAoIXRoaXMuY2FuU2VsZWN0SXRlbXNPbkJsdXIpIHtcbiAgICAgIHRoaXMuc2V0QWN0aXZlKHZvaWQgMCk7XG4gICAgfVxuICB9XG5cbiAgaXNBY3RpdmUodmFsdWU6IFR5cGVhaGVhZE1hdGNoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuYWN0aXZlID09PSB2YWx1ZTtcbiAgfVxuXG4gIHNlbGVjdE1hdGNoKHZhbHVlPzogVHlwZWFoZWFkTWF0Y2gsIGV2ZW50PzogRXZlbnQpOiBib29sZWFuIHtcbiAgICBpZiAoZXZlbnQpIHtcbiAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG4gICAgdGhpcy5wYXJlbnQ/LmNoYW5nZU1vZGVsKHZhbHVlKTtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMucGFyZW50Py50eXBlYWhlYWRPblNlbGVjdC5lbWl0KHZhbHVlKSwgMCk7XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBzZXRTY3JvbGxhYmxlTW9kZSgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMudWxFbGVtZW50KSB7XG4gICAgICB0aGlzLnVsRWxlbWVudCA9IHRoaXMuZWxlbWVudDtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5saUVsZW1lbnRzPy5maXJzdCkge1xuICAgICAgY29uc3QgdWxTdHlsZXMgPSBVdGlscy5nZXRTdHlsZXModGhpcy51bEVsZW1lbnQubmF0aXZlRWxlbWVudCk7XG4gICAgICBjb25zdCBsaVN0eWxlcyA9IFV0aWxzLmdldFN0eWxlcyh0aGlzLmxpRWxlbWVudHMuZmlyc3QubmF0aXZlRWxlbWVudCk7XG4gICAgICBjb25zdCB1bFBhZGRpbmdCb3R0b20gPSBwYXJzZUZsb2F0KCh1bFN0eWxlc1sncGFkZGluZy1ib3R0b20nXSA/IHVsU3R5bGVzWydwYWRkaW5nLWJvdHRvbSddIDogJycpXG4gICAgICAgIC5yZXBsYWNlKCdweCcsICcnKSk7XG4gICAgICBjb25zdCB1bFBhZGRpbmdUb3AgPSBwYXJzZUZsb2F0KCh1bFN0eWxlc1sncGFkZGluZy10b3AnXSA/IHVsU3R5bGVzWydwYWRkaW5nLXRvcCddIDogJzAnKVxuICAgICAgICAucmVwbGFjZSgncHgnLCAnJykpO1xuICAgICAgY29uc3Qgb3B0aW9uSGVpZ2h0ID0gcGFyc2VGbG9hdCgobGlTdHlsZXMuaGVpZ2h0ID8gbGlTdHlsZXMuaGVpZ2h0IDogJzAnKVxuICAgICAgICAucmVwbGFjZSgncHgnLCAnJykpO1xuICAgICAgY29uc3QgaGVpZ2h0ID0gdGhpcy50eXBlYWhlYWRPcHRpb25zSW5TY3JvbGxhYmxlVmlldyAqIG9wdGlvbkhlaWdodDtcbiAgICAgIHRoaXMuZ3VpSGVpZ2h0ID0gYCR7aGVpZ2h0ICsgdWxQYWRkaW5nVG9wICsgdWxQYWRkaW5nQm90dG9tfXB4YDtcbiAgICB9XG5cbiAgICB0aGlzLnJlbmRlcmVyLnNldFN0eWxlKHRoaXMuZWxlbWVudC5uYXRpdmVFbGVtZW50LCAndmlzaWJpbGl0eScsICd2aXNpYmxlJyk7XG4gIH1cblxuICBzY3JvbGxQcmV2aW91cyhpbmRleDogbnVtYmVyKTogdm9pZCB7XG4gICAgaWYgKGluZGV4ID09PSAwKSB7XG4gICAgICB0aGlzLnNjcm9sbFRvQm90dG9tKCk7XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHRoaXMubGlFbGVtZW50cyAmJiB0aGlzLnVsRWxlbWVudCkge1xuICAgICAgY29uc3QgbGlFbGVtZW50ID0gdGhpcy5saUVsZW1lbnRzLnRvQXJyYXkoKVtpbmRleCAtIDFdO1xuICAgICAgaWYgKGxpRWxlbWVudCAmJiAhdGhpcy5pc1Njcm9sbGVkSW50b1ZpZXcobGlFbGVtZW50Lm5hdGl2ZUVsZW1lbnQpKSB7XG4gICAgICAgIHRoaXMudWxFbGVtZW50Lm5hdGl2ZUVsZW1lbnQuc2Nyb2xsVG9wID0gbGlFbGVtZW50Lm5hdGl2ZUVsZW1lbnQub2Zmc2V0VG9wO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHNjcm9sbE5leHQoaW5kZXg6IG51bWJlcik6IHZvaWQge1xuICAgIGlmIChpbmRleCArIDEgPiB0aGlzLm1hdGNoZXMubGVuZ3RoIC0gMSkge1xuICAgICAgdGhpcy5zY3JvbGxUb1RvcCgpO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICh0aGlzLmxpRWxlbWVudHMgJiYgdGhpcy51bEVsZW1lbnQpIHtcbiAgICAgIGNvbnN0IGxpRWxlbWVudCA9IHRoaXMubGlFbGVtZW50cy50b0FycmF5KClbaW5kZXggKyAxXTtcbiAgICAgIGlmIChsaUVsZW1lbnQgJiYgIXRoaXMuaXNTY3JvbGxlZEludG9WaWV3KGxpRWxlbWVudC5uYXRpdmVFbGVtZW50KSkge1xuICAgICAgICB0aGlzLnVsRWxlbWVudC5uYXRpdmVFbGVtZW50LnNjcm9sbFRvcCA9XG4gICAgICAgICAgbGlFbGVtZW50Lm5hdGl2ZUVsZW1lbnQub2Zmc2V0VG9wIC1cbiAgICAgICAgICBOdW1iZXIodGhpcy51bEVsZW1lbnQubmF0aXZlRWxlbWVudC5vZmZzZXRIZWlnaHQpICtcbiAgICAgICAgICBOdW1iZXIobGlFbGVtZW50Lm5hdGl2ZUVsZW1lbnQub2Zmc2V0SGVpZ2h0KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICB0aGlzLnBvc2l0aW9uU2VydmljZVN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICB9XG5cbiAgcHJvdGVjdGVkIHNldEFjdGl2ZSh2YWx1ZT86IFR5cGVhaGVhZE1hdGNoKTogdm9pZCB7XG4gICAgdGhpcy5fYWN0aXZlID0gdmFsdWU7XG4gICAgbGV0IHByZXZpZXc7XG4gICAgaWYgKCEodGhpcy5fYWN0aXZlID09IG51bGwgfHwgdGhpcy5fYWN0aXZlLmlzSGVhZGVyKCkpKSB7XG4gICAgICBwcmV2aWV3ID0gdmFsdWU7XG4gICAgfVxuICAgIHRoaXMucGFyZW50Py50eXBlYWhlYWRPblByZXZpZXcuZW1pdChwcmV2aWV3KTtcbiAgfVxuXG4gIHByaXZhdGUgaXNTY3JvbGxlZEludG9WaWV3KGVsZW06IEhUTUxFbGVtZW50KTogYm9vbGVhbiB7XG4gICAgaWYgKCF0aGlzLnVsRWxlbWVudCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBjb25zdCBjb250YWluZXJWaWV3VG9wOiBudW1iZXIgPSB0aGlzLnVsRWxlbWVudC5uYXRpdmVFbGVtZW50LnNjcm9sbFRvcDtcbiAgICBjb25zdCBjb250YWluZXJWaWV3Qm90dG9tID0gY29udGFpbmVyVmlld1RvcCArIE51bWJlcih0aGlzLnVsRWxlbWVudC5uYXRpdmVFbGVtZW50Lm9mZnNldEhlaWdodCk7XG4gICAgY29uc3QgZWxlbVRvcCA9IGVsZW0ub2Zmc2V0VG9wO1xuICAgIGNvbnN0IGVsZW1Cb3R0b20gPSBlbGVtVG9wICsgZWxlbS5vZmZzZXRIZWlnaHQ7XG5cbiAgICByZXR1cm4gKChlbGVtQm90dG9tIDw9IGNvbnRhaW5lclZpZXdCb3R0b20pICYmIChlbGVtVG9wID49IGNvbnRhaW5lclZpZXdUb3ApKTtcbiAgfVxuXG4gIHByaXZhdGUgc2Nyb2xsVG9Cb3R0b20oKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLnVsRWxlbWVudD8ubmF0aXZlRWxlbWVudCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnVsRWxlbWVudC5uYXRpdmVFbGVtZW50LnNjcm9sbFRvcCA9IHRoaXMudWxFbGVtZW50Lm5hdGl2ZUVsZW1lbnQuc2Nyb2xsSGVpZ2h0O1xuICB9XG5cbiAgcHJpdmF0ZSBzY3JvbGxUb1RvcCgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMudWxFbGVtZW50Py5uYXRpdmVFbGVtZW50KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMudWxFbGVtZW50Lm5hdGl2ZUVsZW1lbnQuc2Nyb2xsVG9wID0gMDtcbiAgfVxufVxuIiwiPCEtLSBpbmplY3Qgb3B0aW9ucyBsaXN0IHRlbXBsYXRlIC0tPlxuPG5nLXRlbXBsYXRlIFtuZ1RlbXBsYXRlT3V0bGV0XT1cIm9wdGlvbnNMaXN0VGVtcGxhdGUgfHwgYnM0VGVtcGxhdGVcIlxuICAgICAgICAgICAgIFtuZ1RlbXBsYXRlT3V0bGV0Q29udGV4dF09XCJ7XG4gICAgICAgICAgICAgICBtYXRjaGVzOiBtYXRjaGVzLFxuICAgICAgICAgICAgICAgaXRlbVRlbXBsYXRlOiBpdGVtVGVtcGxhdGUgfHwgYnNJdGVtVGVtcGxhdGUsXG4gICAgICAgICAgICAgICBxdWVyeTogcXVlcnksXG4gICAgICAgICAgICAgICAkaW1wbGljaXQ6IHR5cGVhaGVhZFRlbXBsYXRlTWV0aG9kc1xuICAgICAgICAgICAgIH1cIj5cbjwvbmctdGVtcGxhdGU+XG5cbjwhLS0gZGVmYXVsdCBvcHRpb25zIGl0ZW0gdGVtcGxhdGUgLS0+XG48bmctdGVtcGxhdGUgI2JzSXRlbVRlbXBsYXRlIGxldC1tYXRjaD1cIm1hdGNoXCIgbGV0LXF1ZXJ5PVwicXVlcnlcIj5cbiAgPHNwYW4gW2lubmVySHRtbF09XCJoaWdobGlnaHQobWF0Y2gsIHF1ZXJ5KVwiPjwvc3Bhbj5cbjwvbmctdGVtcGxhdGU+XG5cbjwhLS0gQm9vdHN0cmFwIDQgb3B0aW9ucyBsaXN0IHRlbXBsYXRlIC0tPlxuPG5nLXRlbXBsYXRlICNiczRUZW1wbGF0ZT5cbiAgPG5nLXRlbXBsYXRlIG5nRm9yIGxldC1tYXRjaCBsZXQtaT1cImluZGV4XCIgW25nRm9yT2ZdPVwibWF0Y2hlc1wiPlxuICAgIDxoNiAqbmdJZj1cIm1hdGNoLmlzSGVhZGVyKClcIiBjbGFzcz1cImRyb3Bkb3duLWhlYWRlclwiPnt7IG1hdGNoIH19PC9oNj5cbiAgICA8bmctdGVtcGxhdGUgW25nSWZdPVwiIW1hdGNoLmlzSGVhZGVyKClcIj5cbiAgICAgIDxidXR0b24gI2xpRWxlbWVudHNcbiAgICAgICAgICAgICAgW2lkXT1cInBvcHVwSWQgKyAnLScgKyBpXCJcbiAgICAgICAgICAgICAgcm9sZT1cIm9wdGlvblwiXG4gICAgICAgICAgICAgIFtAdHlwZWFoZWFkQW5pbWF0aW9uXT1cImFuaW1hdGlvblN0YXRlXCJcbiAgICAgICAgICAgICAgY2xhc3M9XCJkcm9wZG93bi1pdGVtXCJcbiAgICAgICAgICAgICAgKGNsaWNrKT1cInNlbGVjdE1hdGNoKG1hdGNoLCAkZXZlbnQpXCJcbiAgICAgICAgICAgICAgKG1vdXNlZW50ZXIpPVwic2VsZWN0QWN0aXZlKG1hdGNoKVwiXG4gICAgICAgICAgICAgIFtjbGFzcy5hY3RpdmVdPVwiaXNBY3RpdmUobWF0Y2gpXCI+XG4gICAgICAgIDxuZy10ZW1wbGF0ZSBbbmdUZW1wbGF0ZU91dGxldF09XCJpdGVtVGVtcGxhdGUgfHwgYnNJdGVtVGVtcGxhdGVcIlxuICAgICAgICAgICAgICAgICAgICAgW25nVGVtcGxhdGVPdXRsZXRDb250ZXh0XT1cIntpdGVtOiBtYXRjaC5pdGVtLCBpbmRleDogaSwgbWF0Y2g6IG1hdGNoLCBxdWVyeTogcXVlcnl9XCI+XG4gICAgICAgIDwvbmctdGVtcGxhdGU+XG4gICAgICA8L2J1dHRvbj5cbiAgICA8L25nLXRlbXBsYXRlPlxuICA8L25nLXRlbXBsYXRlPlxuPC9uZy10ZW1wbGF0ZT5cbiJdfQ==