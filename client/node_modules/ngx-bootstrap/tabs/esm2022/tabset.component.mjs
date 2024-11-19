import { Component, HostBinding, Input, Renderer2, ElementRef } from '@angular/core';
import { TabsetConfig } from './tabset.config';
import { NgTranscludeDirective } from './ng-transclude.directive';
import { NgClass, NgFor, NgIf } from '@angular/common';
import * as i0 from "@angular/core";
import * as i1 from "./tabset.config";
// todo: add active event to tab
// todo: fix? mixing static and dynamic tabs position tabs in order of creation
export class TabsetComponent {
    /** if true tabs will be placed vertically */
    get vertical() {
        return this._vertical;
    }
    set vertical(value) {
        this._vertical = value;
        this.setClassMap();
    }
    /** if true tabs fill the container and have a consistent width */
    get justified() {
        return this._justified;
    }
    set justified(value) {
        this._justified = value;
        this.setClassMap();
    }
    /** navigation context class: 'tabs' or 'pills' */
    get type() {
        return this._type;
    }
    set type(value) {
        this._type = value;
        this.setClassMap();
    }
    get isKeysAllowed() {
        return this._isKeysAllowed;
    }
    set isKeysAllowed(value) {
        this._isKeysAllowed = value;
    }
    constructor(config, renderer, elementRef) {
        this.renderer = renderer;
        this.elementRef = elementRef;
        this.clazz = true;
        this.tabs = [];
        this.classMap = {};
        /** aria label for tab list */
        this.ariaLabel = 'Tabs';
        this.isDestroyed = false;
        this._vertical = false;
        this._justified = false;
        this._type = 'tabs';
        this._isKeysAllowed = true;
        Object.assign(this, config);
    }
    ngOnDestroy() {
        this.isDestroyed = true;
    }
    addTab(tab) {
        this.tabs.push(tab);
        tab.active = this.tabs.length === 1 && !tab.active;
    }
    removeTab(tab, options = { reselect: true, emit: true }) {
        const index = this.tabs.indexOf(tab);
        if (index === -1 || this.isDestroyed) {
            return;
        }
        // Select a new tab if the tab to be removed is selected and not destroyed
        if (options.reselect && tab.active && this.hasAvailableTabs(index)) {
            const newActiveIndex = this.getClosestTabIndex(index);
            this.tabs[newActiveIndex].active = true;
        }
        if (options.emit) {
            tab.removed.emit(tab);
        }
        this.tabs.splice(index, 1);
        if (tab.elementRef.nativeElement.parentNode) {
            this.renderer.removeChild(tab.elementRef.nativeElement.parentNode, tab.elementRef.nativeElement);
        }
    }
    keyNavActions(event, index) {
        if (!this.isKeysAllowed) {
            return;
        }
        const list = Array.from(this.elementRef.nativeElement.querySelectorAll('.nav-link'));
        // const activeElList = list.filter((el: HTMLElement) => !el.classList.contains('disabled'));
        if (event.keyCode === 13 || event.key === 'Enter' || event.keyCode === 32 || event.key === 'Space') {
            event.preventDefault();
            const currentTab = list[(index) % list.length];
            currentTab.click();
            return;
        }
        if (event.keyCode === 39 || event.key === 'RightArrow') {
            let nextTab;
            let shift = 1;
            do {
                nextTab = list[(index + shift) % list.length];
                shift++;
            } while (nextTab.classList.contains('disabled'));
            nextTab.focus();
            return;
        }
        if (event.keyCode === 37 || event.key === 'LeftArrow') {
            let previousTab;
            let shift = 1;
            let i = index;
            do {
                if ((i - shift) < 0) {
                    i = list.length - 1;
                    previousTab = list[i];
                    shift = 0;
                }
                else {
                    previousTab = list[i - shift];
                }
                shift++;
            } while (previousTab.classList.contains('disabled'));
            previousTab.focus();
            return;
        }
        if (event.keyCode === 36 || event.key === 'Home') {
            event.preventDefault();
            let firstTab;
            let shift = 0;
            do {
                firstTab = list[shift % list.length];
                shift++;
            } while (firstTab.classList.contains('disabled'));
            firstTab.focus();
            return;
        }
        if (event.keyCode === 35 || event.key === 'End') {
            event.preventDefault();
            let lastTab;
            let shift = 1;
            let i = index;
            do {
                if ((i - shift) < 0) {
                    i = list.length - 1;
                    lastTab = list[i];
                    shift = 0;
                }
                else {
                    lastTab = list[i - shift];
                }
                shift++;
            } while (lastTab.classList.contains('disabled'));
            lastTab.focus();
            return;
        }
        if (event.keyCode === 46 || event.key === 'Delete') {
            if (this.tabs[index].removable) {
                this.removeTab(this.tabs[index]);
                if (list[index + 1]) {
                    list[(index + 1) % list.length].focus();
                    return;
                }
                if (list[list.length - 1]) {
                    list[0].focus();
                }
            }
        }
    }
    getClosestTabIndex(index) {
        const tabsLength = this.tabs.length;
        if (!tabsLength) {
            return -1;
        }
        for (let step = 1; step <= tabsLength; step += 1) {
            const prevIndex = index - step;
            const nextIndex = index + step;
            if (this.tabs[prevIndex] && !this.tabs[prevIndex].disabled) {
                return prevIndex;
            }
            if (this.tabs[nextIndex] && !this.tabs[nextIndex].disabled) {
                return nextIndex;
            }
        }
        return -1;
    }
    hasAvailableTabs(index) {
        const tabsLength = this.tabs.length;
        if (!tabsLength) {
            return false;
        }
        for (let i = 0; i < tabsLength; i += 1) {
            if (!this.tabs[i].disabled && i !== index) {
                return true;
            }
        }
        return false;
    }
    setClassMap() {
        this.classMap = {
            'nav-stacked': this.vertical,
            'flex-column': this.vertical,
            'nav-justified': this.justified,
            [`nav-${this.type}`]: true
        };
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: TabsetComponent, deps: [{ token: i1.TabsetConfig }, { token: i0.Renderer2 }, { token: i0.ElementRef }], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "18.0.1", type: TabsetComponent, isStandalone: true, selector: "tabset", inputs: { vertical: "vertical", justified: "justified", type: "type" }, host: { properties: { "class.tab-container": "this.clazz" } }, ngImport: i0, template: "<ul class=\"nav\" [ngClass]=\"classMap\"\n    (click)=\"$event.preventDefault()\"\n    [attr.aria-label]=\"ariaLabel\"\n    role=\"tablist\">\n  <li *ngFor=\"let tabz of tabs; let i = index\" [ngClass]=\"['nav-item', tabz.customClass || '']\"\n      [class.active]=\"tabz.active\" [class.disabled]=\"tabz.disabled\" (keydown)=\"keyNavActions($event, i)\">\n    <a href=\"javascript:void(0);\" class=\"nav-link\" role=\"tab\"\n       [attr.aria-controls]=\"tabz.id ? tabz.id : ''\"\n       [attr.aria-selected]=\"!!tabz.active\"\n       [attr.id]=\"tabz.id ? tabz.id + '-link' : ''\"\n       [class.active]=\"tabz.active\" [class.disabled]=\"tabz.disabled\"\n       (click)=\"tabz.active = true\">\n      <span [ngTransclude]=\"tabz.headingRef\">{{ tabz.heading }}</span>\n      <span *ngIf=\"tabz.removable\" (click)=\"$event.preventDefault(); removeTab(tabz);\" class=\"bs-remove-tab\"> &#10060;</span>\n    </a>\n  </li>\n</ul>\n<div class=\"tab-content\">\n  <ng-content></ng-content>\n</div>\n", styles: [":host .nav-tabs .nav-item.disabled a.disabled{cursor:default}\n"], dependencies: [{ kind: "directive", type: NgClass, selector: "[ngClass]", inputs: ["class", "ngClass"] }, { kind: "directive", type: NgFor, selector: "[ngFor][ngForOf]", inputs: ["ngForOf", "ngForTrackBy", "ngForTemplate"] }, { kind: "directive", type: NgTranscludeDirective, selector: "[ngTransclude]", inputs: ["ngTransclude"] }, { kind: "directive", type: NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: TabsetComponent, decorators: [{
            type: Component,
            args: [{ selector: 'tabset', standalone: true, imports: [NgClass, NgFor, NgTranscludeDirective, NgIf], template: "<ul class=\"nav\" [ngClass]=\"classMap\"\n    (click)=\"$event.preventDefault()\"\n    [attr.aria-label]=\"ariaLabel\"\n    role=\"tablist\">\n  <li *ngFor=\"let tabz of tabs; let i = index\" [ngClass]=\"['nav-item', tabz.customClass || '']\"\n      [class.active]=\"tabz.active\" [class.disabled]=\"tabz.disabled\" (keydown)=\"keyNavActions($event, i)\">\n    <a href=\"javascript:void(0);\" class=\"nav-link\" role=\"tab\"\n       [attr.aria-controls]=\"tabz.id ? tabz.id : ''\"\n       [attr.aria-selected]=\"!!tabz.active\"\n       [attr.id]=\"tabz.id ? tabz.id + '-link' : ''\"\n       [class.active]=\"tabz.active\" [class.disabled]=\"tabz.disabled\"\n       (click)=\"tabz.active = true\">\n      <span [ngTransclude]=\"tabz.headingRef\">{{ tabz.heading }}</span>\n      <span *ngIf=\"tabz.removable\" (click)=\"$event.preventDefault(); removeTab(tabz);\" class=\"bs-remove-tab\"> &#10060;</span>\n    </a>\n  </li>\n</ul>\n<div class=\"tab-content\">\n  <ng-content></ng-content>\n</div>\n", styles: [":host .nav-tabs .nav-item.disabled a.disabled{cursor:default}\n"] }]
        }], ctorParameters: () => [{ type: i1.TabsetConfig }, { type: i0.Renderer2 }, { type: i0.ElementRef }], propDecorators: { vertical: [{
                type: Input
            }], justified: [{
                type: Input
            }], type: [{
                type: Input
            }], clazz: [{
                type: HostBinding,
                args: ['class.tab-container']
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFic2V0LmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy90YWJzL3RhYnNldC5jb21wb25lbnQudHMiLCIuLi8uLi8uLi8uLi9zcmMvdGFicy90YWJzZXQuY29tcG9uZW50Lmh0bWwiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFhLFNBQVMsRUFBRSxVQUFVLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFHaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLGlCQUFpQixDQUFDOzs7QUFDdkQsZ0NBQWdDO0FBQ2hDLCtFQUErRTtBQVEvRSxNQUFNLE9BQU8sZUFBZTtJQUMxQiw2Q0FBNkM7SUFDN0MsSUFDSSxRQUFRO1FBQ1YsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO0lBQ3hCLENBQUM7SUFDRCxJQUFJLFFBQVEsQ0FBQyxLQUFjO1FBQ3pCLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUNyQixDQUFDO0lBRUQsa0VBQWtFO0lBQ2xFLElBQ0ksU0FBUztRQUNYLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztJQUN6QixDQUFDO0lBQ0QsSUFBSSxTQUFTLENBQUMsS0FBYztRQUMxQixJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQztRQUN4QixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDckIsQ0FBQztJQUVELGtEQUFrRDtJQUNsRCxJQUNJLElBQUk7UUFDTixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7SUFDcEIsQ0FBQztJQUNELElBQUksSUFBSSxDQUFDLEtBQWE7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QUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsSUFBSSxDQUFDLEtBQUssS0FBSyxFQUFFLENBQUM7Z0JBQzFDLE9BQU8sSUFBSSxDQUFDO1lBQ2QsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFUyxXQUFXO1FBQ25CLElBQUksQ0FBQyxRQUFRLEdBQUc7WUFDZCxhQUFhLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDNUIsYUFBYSxFQUFFLElBQUksQ0FBQyxRQUFRO1lBQzVCLGVBQWUsRUFBRSxJQUFJLENBQUMsU0FBUztZQUMvQixDQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSTtTQUMzQixDQUFDO0lBQ0osQ0FBQzs4R0F0UFUsZUFBZTtrR0FBZixlQUFlLHlNQ2Y1Qix1K0JBb0JBLHlIRFBjLE9BQU8sb0ZBQUUsS0FBSyxtSEFBRSxxQkFBcUIscUZBQUUsSUFBSTs7MkZBRTVDLGVBQWU7a0JBUDNCLFNBQVM7K0JBQ0ksUUFBUSxjQUdOLElBQUksV0FDUCxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUscUJBQXFCLEVBQUUsSUFBSSxDQUFDO2tJQUtwRCxRQUFRO3NCQURYLEtBQUs7Z0JBV0YsU0FBUztzQkFEWixLQUFLO2dCQVdGLElBQUk7c0JBRFAsS0FBSztnQkFpQjhCLEtBQUs7c0JBQXhDLFdBQVc7dUJBQUMscUJBQXFCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBIb3N0QmluZGluZywgSW5wdXQsIE9uRGVzdHJveSwgUmVuZGVyZXIyLCBFbGVtZW50UmVmIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmltcG9ydCB7IFRhYkRpcmVjdGl2ZSB9IGZyb20gJy4vdGFiLmRpcmVjdGl2ZSc7XG5pbXBvcnQgeyBUYWJzZXRDb25maWcgfSBmcm9tICcuL3RhYnNldC5jb25maWcnO1xuaW1wb3J0IHsgTmdUcmFuc2NsdWRlRGlyZWN0aXZlIH0gZnJvbSAnLi9uZy10cmFuc2NsdWRlLmRpcmVjdGl2ZSc7XG5pbXBvcnQgeyBOZ0NsYXNzLCBOZ0ZvciwgTmdJZiB9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG4vLyB0b2RvOiBhZGQgYWN0aXZlIGV2ZW50IHRvIHRhYlxuLy8gdG9kbzogZml4PyBtaXhpbmcgc3RhdGljIGFuZCBkeW5hbWljIHRhYnMgcG9zaXRpb24gdGFicyBpbiBvcmRlciBvZiBjcmVhdGlvblxuQENvbXBvbmVudCh7XG4gICAgc2VsZWN0b3I6ICd0YWJzZXQnLFxuICAgIHRlbXBsYXRlVXJsOiAnLi90YWJzZXQuY29tcG9uZW50Lmh0bWwnLFxuICAgIHN0eWxlVXJsczogWycuL3RhYnMuc2NzcyddLFxuICAgIHN0YW5kYWxvbmU6IHRydWUsXG4gICAgaW1wb3J0czogW05nQ2xhc3MsIE5nRm9yLCBOZ1RyYW5zY2x1ZGVEaXJlY3RpdmUsIE5nSWZdXG59KVxuZXhwb3J0IGNsYXNzIFRhYnNldENvbXBvbmVudCBpbXBsZW1lbnRzIE9uRGVzdHJveSB7XG4gIC8qKiBpZiB0cnVlIHRhYnMgd2lsbCBiZSBwbGFjZWQgdmVydGljYWxseSAqL1xuICBASW5wdXQoKVxuICBnZXQgdmVydGljYWwoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuX3ZlcnRpY2FsO1xuICB9XG4gIHNldCB2ZXJ0aWNhbCh2YWx1ZTogYm9vbGVhbikge1xuICAgIHRoaXMuX3ZlcnRpY2FsID0gdmFsdWU7XG4gICAgdGhpcy5zZXRDbGFzc01hcCgpO1xuICB9XG5cbiAgLyoqIGlmIHRydWUgdGFicyBmaWxsIHRoZSBjb250YWluZXIgYW5kIGhhdmUgYSBjb25zaXN0ZW50IHdpZHRoICovXG4gIEBJbnB1dCgpXG4gIGdldCBqdXN0aWZpZWQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuX2p1c3RpZmllZDtcbiAgfVxuICBzZXQganVzdGlmaWVkKHZhbHVlOiBib29sZWFuKSB7XG4gICAgdGhpcy5fanVzdGlmaWVkID0gdmFsdWU7XG4gICAgdGhpcy5zZXRDbGFzc01hcCgpO1xuICB9XG5cbiAgLyoqIG5hdmlnYXRpb24gY29udGV4dCBjbGFzczogJ3RhYnMnIG9yICdwaWxscycgKi9cbiAgQElucHV0KClcbiAgZ2V0IHR5cGUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fdHlwZTtcbiAgfVxuICBzZXQgdHlwZSh2YWx1ZTogc3RyaW5nKSB7XG4gICAgdGhpcy5fdHlwZSA9IHZhbHVlO1xuICAgIHRoaXMuc2V0Q2xhc3NNYXAoKTtcbiAgfVxuXG4gIGdldCBpc0tleXNBbGxvd2VkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9pc0tleXNBbGxvd2VkO1xuICB9XG5cbiAgc2V0IGlzS2V5c0FsbG93ZWQodmFsdWU6IGJvb2xlYW4pIHtcbiAgICB0aGlzLl9pc0tleXNBbGxvd2VkID0gdmFsdWU7XG4gIH1cblxuICBASG9zdEJpbmRpbmcoJ2NsYXNzLnRhYi1jb250YWluZXInKSBjbGF6eiA9IHRydWU7XG5cbiAgdGFiczogVGFiRGlyZWN0aXZlW10gPSBbXTtcbiAgY2xhc3NNYXA6IHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB9ID0ge307XG5cbiAgLyoqIGFyaWEgbGFiZWwgZm9yIHRhYiBsaXN0ICovXG4gIGFyaWFMYWJlbCA9ICdUYWJzJztcblxuICBwcm90ZWN0ZWQgaXNEZXN0cm95ZWQgPSBmYWxzZTtcbiAgcHJvdGVjdGVkIF92ZXJ0aWNhbCA9IGZhbHNlO1xuICBwcm90ZWN0ZWQgX2p1c3RpZmllZCA9IGZhbHNlO1xuICBwcm90ZWN0ZWQgX3R5cGUgPSAndGFicyc7XG4gIHByb3RlY3RlZCBfaXNLZXlzQWxsb3dlZCA9IHRydWU7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgY29uZmlnOiBUYWJzZXRDb25maWcsXG4gICAgcHJpdmF0ZSByZW5kZXJlcjogUmVuZGVyZXIyLFxuICAgIHByaXZhdGUgZWxlbWVudFJlZjogRWxlbWVudFJlZlxuICApIHtcbiAgICBPYmplY3QuYXNzaWduKHRoaXMsIGNvbmZpZyk7XG4gIH1cblxuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICB0aGlzLmlzRGVzdHJveWVkID0gdHJ1ZTtcbiAgfVxuXG4gIGFkZFRhYih0YWI6IFRhYkRpcmVjdGl2ZSk6IHZvaWQge1xuICAgIHRoaXMudGFicy5wdXNoKHRhYik7XG4gICAgdGFiLmFjdGl2ZSA9IHRoaXMudGFicy5sZW5ndGggPT09IDEgJiYgIXRhYi5hY3RpdmU7XG4gIH1cblxuICByZW1vdmVUYWIoXG4gICAgdGFiOiBUYWJEaXJlY3RpdmUsXG4gICAgb3B0aW9ucyA9IHsgcmVzZWxlY3Q6IHRydWUsIGVtaXQ6IHRydWUgfVxuICApOiB2b2lkIHtcbiAgICBjb25zdCBpbmRleCA9IHRoaXMudGFicy5pbmRleE9mKHRhYik7XG4gICAgaWYgKGluZGV4ID09PSAtMSB8fCB0aGlzLmlzRGVzdHJveWVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIFNlbGVjdCBhIG5ldyB0YWIgaWYgdGhlIHRhYiB0byBiZSByZW1vdmVkIGlzIHNlbGVjdGVkIGFuZCBub3QgZGVzdHJveWVkXG4gICAgaWYgKG9wdGlvbnMucmVzZWxlY3QgJiYgdGFiLmFjdGl2ZSAmJiB0aGlzLmhhc0F2YWlsYWJsZVRhYnMoaW5kZXgpKSB7XG4gICAgICBjb25zdCBuZXdBY3RpdmVJbmRleCA9IHRoaXMuZ2V0Q2xvc2VzdFRhYkluZGV4KGluZGV4KTtcbiAgICAgIHRoaXMudGFic1tuZXdBY3RpdmVJbmRleF0uYWN0aXZlID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMuZW1pdCkge1xuICAgICAgdGFiLnJlbW92ZWQuZW1pdCh0YWIpO1xuICAgIH1cbiAgICB0aGlzLnRhYnMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICBpZiAodGFiLmVsZW1lbnRSZWYubmF0aXZlRWxlbWVudC5wYXJlbnROb2RlKSB7XG4gICAgICB0aGlzLnJlbmRlcmVyLnJlbW92ZUNoaWxkKFxuICAgICAgICB0YWIuZWxlbWVudFJlZi5uYXRpdmVFbGVtZW50LnBhcmVudE5vZGUsXG4gICAgICAgIHRhYi5lbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnRcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgICBrZXlOYXZBY3Rpb25zKGV2ZW50OiBLZXlib2FyZEV2ZW50LCBpbmRleDogbnVtYmVyKSB7XG4gICAgaWYgKCF0aGlzLmlzS2V5c0FsbG93ZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgbGlzdDogSFRNTEVsZW1lbnRbXSA9IEFycmF5LmZyb20odGhpcy5lbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLm5hdi1saW5rJykpO1xuICAgIC8vIGNvbnN0IGFjdGl2ZUVsTGlzdCA9IGxpc3QuZmlsdGVyKChlbDogSFRNTEVsZW1lbnQpID0+ICFlbC5jbGFzc0xpc3QuY29udGFpbnMoJ2Rpc2FibGVkJykpO1xuICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMyB8fCBldmVudC5rZXkgPT09ICdFbnRlcicgfHwgZXZlbnQua2V5Q29kZSA9PT0gMzIgfHwgZXZlbnQua2V5ID09PSAnU3BhY2UnKSB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgY29uc3QgY3VycmVudFRhYiA9IGxpc3RbKGluZGV4KSAlIGxpc3QubGVuZ3RoXTtcbiAgICAgIGN1cnJlbnRUYWIuY2xpY2soKTtcblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChldmVudC5rZXlDb2RlID09PSAzOSB8fCBldmVudC5rZXkgPT09ICdSaWdodEFycm93Jykge1xuICAgICAgbGV0IG5leHRUYWI6IEhUTUxFbGVtZW50O1xuICAgICAgbGV0IHNoaWZ0ID0gMTtcblxuICAgICAgZG8ge1xuICAgICAgICBuZXh0VGFiID0gbGlzdFsoaW5kZXggKyBzaGlmdCkgJSBsaXN0Lmxlbmd0aF07XG5cbiAgICAgICAgc2hpZnQrKztcbiAgICAgIH0gd2hpbGUgKG5leHRUYWIuY2xhc3NMaXN0LmNvbnRhaW5zKCdkaXNhYmxlZCcpKTtcblxuICAgICAgbmV4dFRhYi5mb2N1cygpO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDM3IHx8IGV2ZW50LmtleSA9PT0gJ0xlZnRBcnJvdycpIHtcbiAgICAgIGxldCBwcmV2aW91c1RhYjogSFRNTEVsZW1lbnQ7XG4gICAgICBsZXQgc2hpZnQgPSAxO1xuICAgICAgbGV0IGkgPSBpbmRleDtcblxuICAgICAgZG8ge1xuICAgICAgICBpZiAoKGkgLSBzaGlmdCkgPCAwKSB7XG4gICAgICAgICAgaSA9IGxpc3QubGVuZ3RoIC0gMTtcbiAgICAgICAgICBwcmV2aW91c1RhYiA9IGxpc3RbaV07XG4gICAgICAgICAgc2hpZnQgPSAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHByZXZpb3VzVGFiID0gbGlzdFtpIC0gc2hpZnRdO1xuICAgICAgICB9XG5cbiAgICAgICAgc2hpZnQrKztcbiAgICAgIH0gd2hpbGUgKHByZXZpb3VzVGFiLmNsYXNzTGlzdC5jb250YWlucygnZGlzYWJsZWQnKSk7XG5cbiAgICAgIHByZXZpb3VzVGFiLmZvY3VzKCk7XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMzYgfHwgZXZlbnQua2V5ID09PSAnSG9tZScpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgIGxldCBmaXJzdFRhYjogSFRNTEVsZW1lbnQ7XG4gICAgICBsZXQgc2hpZnQgPSAwO1xuXG4gICAgICBkbyB7XG4gICAgICAgIGZpcnN0VGFiID0gbGlzdFtzaGlmdCAlIGxpc3QubGVuZ3RoXTtcblxuICAgICAgICBzaGlmdCsrO1xuICAgICAgfSB3aGlsZSAoZmlyc3RUYWIuY2xhc3NMaXN0LmNvbnRhaW5zKCdkaXNhYmxlZCcpKTtcblxuICAgICAgZmlyc3RUYWIuZm9jdXMoKTtcblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChldmVudC5rZXlDb2RlID09PSAzNSB8fCBldmVudC5rZXkgPT09ICdFbmQnKSB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICBsZXQgbGFzdFRhYjogSFRNTEVsZW1lbnQ7XG4gICAgICBsZXQgc2hpZnQgPSAxO1xuICAgICAgbGV0IGkgPSBpbmRleDtcblxuICAgICAgZG8ge1xuICAgICAgICBpZiAoKGkgLSBzaGlmdCkgPCAwKSB7XG4gICAgICAgICAgaSA9IGxpc3QubGVuZ3RoIC0gMTtcbiAgICAgICAgICBsYXN0VGFiID0gbGlzdFtpXTtcbiAgICAgICAgICBzaGlmdCA9IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGFzdFRhYiA9IGxpc3RbaSAtIHNoaWZ0XTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNoaWZ0Kys7XG4gICAgICB9IHdoaWxlIChsYXN0VGFiLmNsYXNzTGlzdC5jb250YWlucygnZGlzYWJsZWQnKSk7XG5cbiAgICAgIGxhc3RUYWIuZm9jdXMoKTtcblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChldmVudC5rZXlDb2RlID09PSA0NiB8fCBldmVudC5rZXkgPT09ICdEZWxldGUnKSB7XG4gICAgICBpZiAodGhpcy50YWJzW2luZGV4XS5yZW1vdmFibGUpIHtcbiAgICAgICAgdGhpcy5yZW1vdmVUYWIodGhpcy50YWJzW2luZGV4XSk7XG5cbiAgICAgICAgaWYgKGxpc3RbaW5kZXggKyAxXSkge1xuICAgICAgICAgIGxpc3RbKGluZGV4ICsgMSkgJSBsaXN0Lmxlbmd0aF0uZm9jdXMoKTtcblxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChsaXN0W2xpc3QubGVuZ3RoIC0gMV0pIHtcbiAgICAgICAgICBsaXN0WzBdLmZvY3VzKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0Q2xvc2VzdFRhYkluZGV4KGluZGV4OiBudW1iZXIpOiBudW1iZXIge1xuICAgIGNvbnN0IHRhYnNMZW5ndGggPSB0aGlzLnRhYnMubGVuZ3RoO1xuICAgIGlmICghdGFic0xlbmd0aCkge1xuICAgICAgcmV0dXJuIC0xO1xuICAgIH1cblxuICAgIGZvciAobGV0IHN0ZXAgPSAxOyBzdGVwIDw9IHRhYnNMZW5ndGg7IHN0ZXAgKz0gMSkge1xuICAgICAgY29uc3QgcHJldkluZGV4ID0gaW5kZXggLSBzdGVwO1xuICAgICAgY29uc3QgbmV4dEluZGV4ID0gaW5kZXggKyBzdGVwO1xuICAgICAgaWYgKHRoaXMudGFic1twcmV2SW5kZXhdICYmICF0aGlzLnRhYnNbcHJldkluZGV4XS5kaXNhYmxlZCkge1xuICAgICAgICByZXR1cm4gcHJldkluZGV4O1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMudGFic1tuZXh0SW5kZXhdICYmICF0aGlzLnRhYnNbbmV4dEluZGV4XS5kaXNhYmxlZCkge1xuICAgICAgICByZXR1cm4gbmV4dEluZGV4O1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiAtMTtcbiAgfVxuXG4gIHByb3RlY3RlZCBoYXNBdmFpbGFibGVUYWJzKGluZGV4OiBudW1iZXIpOiBib29sZWFuIHtcbiAgICBjb25zdCB0YWJzTGVuZ3RoID0gdGhpcy50YWJzLmxlbmd0aDtcbiAgICBpZiAoIXRhYnNMZW5ndGgpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRhYnNMZW5ndGg7IGkgKz0gMSkge1xuICAgICAgaWYgKCF0aGlzLnRhYnNbaV0uZGlzYWJsZWQgJiYgaSAhPT0gaW5kZXgpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcHJvdGVjdGVkIHNldENsYXNzTWFwKCk6IHZvaWQge1xuICAgIHRoaXMuY2xhc3NNYXAgPSB7XG4gICAgICAnbmF2LXN0YWNrZWQnOiB0aGlzLnZlcnRpY2FsLFxuICAgICAgJ2ZsZXgtY29sdW1uJzogdGhpcy52ZXJ0aWNhbCxcbiAgICAgICduYXYtanVzdGlmaWVkJzogdGhpcy5qdXN0aWZpZWQsXG4gICAgICBbYG5hdi0ke3RoaXMudHlwZX1gXTogdHJ1ZVxuICAgIH07XG4gIH1cbn1cbiIsIjx1bCBjbGFzcz1cIm5hdlwiIFtuZ0NsYXNzXT1cImNsYXNzTWFwXCJcbiAgICAoY2xpY2spPVwiJGV2ZW50LnByZXZlbnREZWZhdWx0KClcIlxuICAgIFthdHRyLmFyaWEtbGFiZWxdPVwiYXJpYUxhYmVsXCJcbiAgICByb2xlPVwidGFibGlzdFwiPlxuICA8bGkgKm5nRm9yPVwibGV0IHRhYnogb2YgdGFiczsgbGV0IGkgPSBpbmRleFwiIFtuZ0NsYXNzXT1cIlsnbmF2LWl0ZW0nLCB0YWJ6LmN1c3RvbUNsYXNzIHx8ICcnXVwiXG4gICAgICBbY2xhc3MuYWN0aXZlXT1cInRhYnouYWN0aXZlXCIgW2NsYXNzLmRpc2FibGVkXT1cInRhYnouZGlzYWJsZWRcIiAoa2V5ZG93bik9XCJrZXlOYXZBY3Rpb25zKCRldmVudCwgaSlcIj5cbiAgICA8YSBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApO1wiIGNsYXNzPVwibmF2LWxpbmtcIiByb2xlPVwidGFiXCJcbiAgICAgICBbYXR0ci5hcmlhLWNvbnRyb2xzXT1cInRhYnouaWQgPyB0YWJ6LmlkIDogJydcIlxuICAgICAgIFthdHRyLmFyaWEtc2VsZWN0ZWRdPVwiISF0YWJ6LmFjdGl2ZVwiXG4gICAgICAgW2F0dHIuaWRdPVwidGFiei5pZCA/IHRhYnouaWQgKyAnLWxpbmsnIDogJydcIlxuICAgICAgIFtjbGFzcy5hY3RpdmVdPVwidGFiei5hY3RpdmVcIiBbY2xhc3MuZGlzYWJsZWRdPVwidGFiei5kaXNhYmxlZFwiXG4gICAgICAgKGNsaWNrKT1cInRhYnouYWN0aXZlID0gdHJ1ZVwiPlxuICAgICAgPHNwYW4gW25nVHJhbnNjbHVkZV09XCJ0YWJ6LmhlYWRpbmdSZWZcIj57eyB0YWJ6LmhlYWRpbmcgfX08L3NwYW4+XG4gICAgICA8c3BhbiAqbmdJZj1cInRhYnoucmVtb3ZhYmxlXCIgKGNsaWNrKT1cIiRldmVudC5wcmV2ZW50RGVmYXVsdCgpOyByZW1vdmVUYWIodGFieik7XCIgY2xhc3M9XCJicy1yZW1vdmUtdGFiXCI+ICYjMTAwNjA7PC9zcGFuPlxuICAgIDwvYT5cbiAgPC9saT5cbjwvdWw+XG48ZGl2IGNsYXNzPVwidGFiLWNvbnRlbnRcIj5cbiAgPG5nLWNvbnRlbnQ+PC9uZy1jb250ZW50PlxuPC9kaXY+XG4iXX0=