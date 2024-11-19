import { Directive, ElementRef, EventEmitter, Input, Output, Renderer2, ViewContainerRef } from '@angular/core';
import { PopoverConfig } from './popover.config';
import { ComponentLoaderFactory } from 'ngx-bootstrap/component-loader';
import { PopoverContainerComponent } from './popover-container.component';
import { PositioningService } from 'ngx-bootstrap/positioning';
import { timer } from 'rxjs';
import { parseTriggers } from 'ngx-bootstrap/utils';
import * as i0 from "@angular/core";
import * as i1 from "./popover.config";
import * as i2 from "ngx-bootstrap/component-loader";
import * as i3 from "ngx-bootstrap/positioning";
let id = 0;
/**
 * A lightweight, extensible directive for fancy popover creation.
 */
export class PopoverDirective {
    /**
     * Returns whether or not the popover is currently being shown
     */
    get isOpen() {
        return this._popover.isShown;
    }
    set isOpen(value) {
        if (value) {
            this.show();
        }
        else {
            this.hide();
        }
    }
    constructor(_config, _elementRef, _renderer, _viewContainerRef, cis, _positionService) {
        this._elementRef = _elementRef;
        this._renderer = _renderer;
        this._positionService = _positionService;
        /** unique id popover - use for aria-describedby */
        this.popoverId = id++;
        /** sets disable adaptive position */
        this.adaptivePosition = true;
        /**
         * Placement of a popover. Accepts: "top", "bottom", "left", "right"
         */
        this.placement = 'top';
        /**
         * Close popover on outside click
         */
        this.outsideClick = false;
        /**
         * Specifies events that should trigger. Supports a space separated list of
         * event names.
         */
        this.triggers = 'click';
        /**
         * Css class for popover container
         */
        this.containerClass = '';
        /**
         * Delay before showing the tooltip
         */
        this.delay = 0;
        this._isInited = false;
        this._popover = cis
            .createLoader(_elementRef, _viewContainerRef, _renderer)
            .provide({ provide: PopoverConfig, useValue: _config });
        Object.assign(this, _config);
        this.onShown = this._popover.onShown;
        this.onHidden = this._popover.onHidden;
        // fix: no focus on button on Mac OS #1795
        if (typeof window !== 'undefined') {
            _elementRef.nativeElement.addEventListener('click', function () {
                try {
                    _elementRef.nativeElement.focus();
                }
                catch (err) {
                    return;
                }
            });
        }
    }
    /**
     * Set attribute aria-describedBy for element directive and
     * set id for the popover
     */
    setAriaDescribedBy() {
        this._ariaDescribedby = this.isOpen ? `ngx-popover-${this.popoverId}` : void 0;
        if (this._ariaDescribedby) {
            if (this._popover.instance) {
                this._popover.instance.popoverId = this._ariaDescribedby;
            }
            this._renderer.setAttribute(this._elementRef.nativeElement, 'aria-describedby', this._ariaDescribedby);
        }
        else {
            this._renderer.removeAttribute(this._elementRef.nativeElement, 'aria-describedby');
        }
    }
    /**
     * Opens an element’s popover. This is considered a “manual” triggering of
     * the popover.
     */
    show() {
        if (this._popover.isShown || !this.popover || this._delayTimeoutId) {
            return;
        }
        this._positionService.setOptions({
            modifiers: {
                flip: {
                    enabled: this.adaptivePosition
                },
                preventOverflow: {
                    enabled: this.adaptivePosition,
                    boundariesElement: this.boundariesElement || 'scrollParent'
                }
            }
        });
        const showPopover = () => {
            if (this._delayTimeoutId) {
                this._delayTimeoutId = undefined;
            }
            this._popover.attach(PopoverContainerComponent).to(this.container).position({ attachment: this.placement }).show({
                content: this.popover,
                context: this.popoverContext,
                placement: this.placement,
                title: this.popoverTitle,
                containerClass: this.containerClass
            });
            if (!this.adaptivePosition && this._popover._componentRef) {
                this._positionService.calcPosition();
                this._positionService.deletePositionElement(this._popover._componentRef.location);
            }
            this.isOpen = true;
            this.setAriaDescribedBy();
        };
        const cancelDelayedTooltipShowing = () => {
            if (this._popoverCancelShowFn) {
                this._popoverCancelShowFn();
            }
        };
        if (this.delay) {
            const _timer = timer(this.delay).subscribe(() => {
                showPopover();
                cancelDelayedTooltipShowing();
            });
            if (this.triggers) {
                parseTriggers(this.triggers).forEach((trigger) => {
                    if (!trigger.close) {
                        return;
                    }
                    this._popoverCancelShowFn = this._renderer.listen(this._elementRef.nativeElement, trigger.close, () => {
                        _timer.unsubscribe();
                        cancelDelayedTooltipShowing();
                    });
                });
            }
        }
        else {
            showPopover();
        }
    }
    /**
     * Closes an element’s popover. This is considered a “manual” triggering of
     * the popover.
     */
    hide() {
        if (this._delayTimeoutId) {
            clearTimeout(this._delayTimeoutId);
            this._delayTimeoutId = undefined;
        }
        if (this.isOpen) {
            this._popover.hide();
            this.setAriaDescribedBy();
            this.isOpen = false;
        }
    }
    /**
     * Toggles an element’s popover. This is considered a “manual” triggering of
     * the popover.
     */
    toggle() {
        if (this.isOpen) {
            return this.hide();
        }
        this.show();
    }
    ngOnInit() {
        // fix: seems there are an issue with `routerLinkActive`
        // which result in duplicated call ngOnInit without call to ngOnDestroy
        // read more: https://github.com/valor-software/ngx-bootstrap/issues/1885
        if (this._isInited) {
            return;
        }
        this._isInited = true;
        this._popover.listen({
            triggers: this.triggers,
            outsideClick: this.outsideClick,
            show: () => this.show(),
            hide: () => this.hide()
        });
    }
    ngOnDestroy() {
        this._popover.dispose();
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: PopoverDirective, deps: [{ token: i1.PopoverConfig }, { token: i0.ElementRef }, { token: i0.Renderer2 }, { token: i0.ViewContainerRef }, { token: i2.ComponentLoaderFactory }, { token: i3.PositioningService }], target: i0.ɵɵFactoryTarget.Directive }); }
    static { this.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "18.0.1", type: PopoverDirective, isStandalone: true, selector: "[popover]", inputs: { adaptivePosition: "adaptivePosition", boundariesElement: "boundariesElement", popover: "popover", popoverContext: "popoverContext", popoverTitle: "popoverTitle", placement: "placement", outsideClick: "outsideClick", triggers: "triggers", container: "container", containerClass: "containerClass", isOpen: "isOpen", delay: "delay" }, outputs: { onShown: "onShown", onHidden: "onHidden" }, providers: [PositioningService, ComponentLoaderFactory], exportAs: ["bs-popover"], ngImport: i0 }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: PopoverDirective, decorators: [{
            type: Directive,
            args: [{
                    selector: '[popover]',
                    exportAs: 'bs-popover',
                    standalone: true,
                    providers: [PositioningService, ComponentLoaderFactory]
                }]
        }], ctorParameters: () => [{ type: i1.PopoverConfig }, { type: i0.ElementRef }, { type: i0.Renderer2 }, { type: i0.ViewContainerRef }, { type: i2.ComponentLoaderFactory }, { type: i3.PositioningService }], propDecorators: { adaptivePosition: [{
                type: Input
            }], boundariesElement: [{
                type: Input
            }], popover: [{
                type: Input
            }], popoverContext: [{
                type: Input
            }], popoverTitle: [{
                type: Input
            }], placement: [{
                type: Input
            }], outsideClick: [{
                type: Input
            }], triggers: [{
                type: Input
            }], container: [{
                type: Input
            }], containerClass: [{
                type: Input
            }], isOpen: [{
                type: Input
            }], delay: [{
                type: Input
            }], onShown: [{
                type: Output
            }], onHidden: [{
                type: Output
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wb3Zlci5kaXJlY3RpdmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvcG9wb3Zlci9wb3BvdmVyLmRpcmVjdGl2ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsU0FBUyxFQUNULFVBQVUsRUFDVixZQUFZLEVBQ1osS0FBSyxFQUdMLE1BQU0sRUFDTixTQUFTLEVBRVQsZ0JBQWdCLEVBQ2pCLE1BQU0sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNqRCxPQUFPLEVBQW1CLHNCQUFzQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDekYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDMUUsT0FBTyxFQUFFLGtCQUFrQixFQUF3QixNQUFNLDJCQUEyQixDQUFDO0FBQ3JGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDN0IsT0FBTyxFQUFFLGFBQWEsRUFBVyxNQUFNLHFCQUFxQixDQUFDOzs7OztBQUU3RCxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFFWDs7R0FFRztBQU9ILE1BQU0sT0FBTyxnQkFBZ0I7SUE0QzNCOztPQUVHO0lBQ0gsSUFDSSxNQUFNO1FBQ1IsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQztJQUMvQixDQUFDO0lBRUQsSUFBSSxNQUFNLENBQUMsS0FBYztRQUN2QixJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1YsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2QsQ0FBQzthQUFNLENBQUM7WUFDTixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDZCxDQUFDO0lBQ0gsQ0FBQztJQXdCRCxZQUNFLE9BQXNCLEVBQ2QsV0FBdUIsRUFDdkIsU0FBb0IsRUFDNUIsaUJBQW1DLEVBQ25DLEdBQTJCLEVBQ25CLGdCQUFvQztRQUpwQyxnQkFBVyxHQUFY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QU87c0JBQWYsS0FBSztnQkFLRyxjQUFjO3NCQUF0QixLQUFLO2dCQUlHLFlBQVk7c0JBQXBCLEtBQUs7Z0JBSUcsU0FBUztzQkFBakIsS0FBSztnQkFJRyxZQUFZO3NCQUFwQixLQUFLO2dCQUtHLFFBQVE7c0JBQWhCLEtBQUs7Z0JBSUcsU0FBUztzQkFBakIsS0FBSztnQkFLRyxjQUFjO3NCQUF0QixLQUFLO2dCQU1GLE1BQU07c0JBRFQsS0FBSztnQkFnQkcsS0FBSztzQkFBYixLQUFLO2dCQUtJLE9BQU87c0JBQWhCLE1BQU07Z0JBSUcsUUFBUTtzQkFBakIsTUFBTSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIERpcmVjdGl2ZSxcbiAgRWxlbWVudFJlZixcbiAgRXZlbnRFbWl0dGVyLFxuICBJbnB1dCxcbiAgT25EZXN0cm95LFxuICBPbkluaXQsXG4gIE91dHB1dCxcbiAgUmVuZGVyZXIyLFxuICBUZW1wbGF0ZVJlZixcbiAgVmlld0NvbnRhaW5lclJlZlxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IFBvcG92ZXJDb25maWcgfSBmcm9tICcuL3BvcG92ZXIuY29uZmlnJztcbmltcG9ydCB7IENvbXBvbmVudExvYWRlciwgQ29tcG9uZW50TG9hZGVyRmFjdG9yeSB9IGZyb20gJ25neC1ib290c3RyYXAvY29tcG9uZW50LWxvYWRlcic7XG5pbXBvcnQgeyBQb3BvdmVyQ29udGFpbmVyQ29tcG9uZW50IH0gZnJvbSAnLi9wb3BvdmVyLWNvbnRhaW5lci5jb21wb25lbnQnO1xuaW1wb3J0IHsgUG9zaXRpb25pbmdTZXJ2aWNlLCBBdmFpbGFibGVCU1Bvc2l0aW9ucyB9IGZyb20gJ25neC1ib290c3RyYXAvcG9zaXRpb25pbmcnO1xuaW1wb3J0IHsgdGltZXIgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IHBhcnNlVHJpZ2dlcnMsIFRyaWdnZXIgfSBmcm9tICduZ3gtYm9vdHN0cmFwL3V0aWxzJztcblxubGV0IGlkID0gMDtcblxuLyoqXG4gKiBBIGxpZ2h0d2VpZ2h0LCBleHRlbnNpYmxlIGRpcmVjdGl2ZSBmb3IgZmFuY3kgcG9wb3ZlciBjcmVhdGlvbi5cbiAqL1xuQERpcmVjdGl2ZSh7XG4gIHNlbGVjdG9yOiAnW3BvcG92ZXJdJyxcbiAgZXhwb3J0QXM6ICdicy1wb3BvdmVyJyxcbiAgc3RhbmRhbG9uZTogdHJ1ZSxcbiAgcHJvdmlkZXJzOiBbIFBvc2l0aW9uaW5nU2VydmljZSwgQ29tcG9uZW50TG9hZGVyRmFjdG9yeSBdXG59KVxuZXhwb3J0IGNsYXNzIFBvcG92ZXJEaXJlY3RpdmUgaW1wbGVtZW50cyBPbkluaXQsIE9uRGVzdHJveSB7XG4gIC8qKiB1bmlxdWUgaWQgcG9wb3ZlciAtIHVzZSBmb3IgYXJpYS1kZXNjcmliZWRieSAqL1xuICBwb3BvdmVySWQgPSBpZCsrO1xuICAvKiogc2V0cyBkaXNhYmxlIGFkYXB0aXZlIHBvc2l0aW9uICovXG4gIEBJbnB1dCgpIGFkYXB0aXZlUG9zaXRpb24gPSB0cnVlO1xuXG4gIEBJbnB1dCgpIGJvdW5kYXJpZXNFbGVtZW50PzogJ3ZpZXdwb3J0JyB8ICdzY3JvbGxQYXJlbnQnIHwgJ3dpbmRvdyc7XG4gIC8qKlxuICAgKiBDb250ZW50IHRvIGJlIGRpc3BsYXllZCBhcyBwb3BvdmVyLlxuICAgKi9cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgQElucHV0KCkgcG9wb3Zlcj86IHN0cmluZyB8IFRlbXBsYXRlUmVmPGFueT47XG4gIC8qKlxuICAgKiBDb250ZXh0IHRvIGJlIHVzZWQgaWYgcG9wb3ZlciBpcyBhIHRlbXBsYXRlLlxuICAgKi9cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgQElucHV0KCkgcG9wb3ZlckNvbnRleHQ6IGFueTtcbiAgLyoqXG4gICAqIFRpdGxlIG9mIGEgcG9wb3Zlci5cbiAgICovXG4gIEBJbnB1dCgpIHBvcG92ZXJUaXRsZT86IHN0cmluZztcbiAgLyoqXG4gICAqIFBsYWNlbWVudCBvZiBhIHBvcG92ZXIuIEFjY2VwdHM6IFwidG9wXCIsIFwiYm90dG9tXCIsIFwibGVmdFwiLCBcInJpZ2h0XCJcbiAgICovXG4gIEBJbnB1dCgpIHBsYWNlbWVudDogQXZhaWxhYmxlQlNQb3NpdGlvbnMgPSAndG9wJztcbiAgLyoqXG4gICAqIENsb3NlIHBvcG92ZXIgb24gb3V0c2lkZSBjbGlja1xuICAgKi9cbiAgQElucHV0KCkgb3V0c2lkZUNsaWNrID0gZmFsc2U7XG4gIC8qKlxuICAgKiBTcGVjaWZpZXMgZXZlbnRzIHRoYXQgc2hvdWxkIHRyaWdnZXIuIFN1cHBvcnRzIGEgc3BhY2Ugc2VwYXJhdGVkIGxpc3Qgb2ZcbiAgICogZXZlbnQgbmFtZXMuXG4gICAqL1xuICBASW5wdXQoKSB0cmlnZ2VycyA9ICdjbGljayc7XG4gIC8qKlxuICAgKiBBIHNlbGVjdG9yIHNwZWNpZnlpbmcgdGhlIGVsZW1lbnQgdGhlIHBvcG92ZXIgc2hvdWxkIGJlIGFwcGVuZGVkIHRvLlxuICAgKi9cbiAgQElucHV0KCkgY29udGFpbmVyPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBDc3MgY2xhc3MgZm9yIHBvcG92ZXIgY29udGFpbmVyXG4gICAqL1xuICBASW5wdXQoKSBjb250YWluZXJDbGFzcyA9ICcnO1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHdoZXRoZXIgb3Igbm90IHRoZSBwb3BvdmVyIGlzIGN1cnJlbnRseSBiZWluZyBzaG93blxuICAgKi9cbiAgQElucHV0KClcbiAgZ2V0IGlzT3BlbigpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fcG9wb3Zlci5pc1Nob3duO1xuICB9XG5cbiAgc2V0IGlzT3Blbih2YWx1ZTogYm9vbGVhbikge1xuICAgIGlmICh2YWx1ZSkge1xuICAgICAgdGhpcy5zaG93KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuaGlkZSgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEZWxheSBiZWZvcmUgc2hvd2luZyB0aGUgdG9vbHRpcFxuICAgKi9cbiAgQElucHV0KCkgZGVsYXkgPSAwO1xuXG4gIC8qKlxuICAgKiBFbWl0cyBhbiBldmVudCB3aGVuIHRoZSBwb3BvdmVyIGlzIHNob3duXG4gICAqL1xuICBAT3V0cHV0KCkgb25TaG93bjogRXZlbnRFbWl0dGVyPHVua25vd24+O1xuICAvKipcbiAgICogRW1pdHMgYW4gZXZlbnQgd2hlbiB0aGUgcG9wb3ZlciBpcyBoaWRkZW5cbiAgICovXG4gIEBPdXRwdXQoKSBvbkhpZGRlbjogRXZlbnRFbWl0dGVyPHVua25vd24+O1xuXG4gIHByb3RlY3RlZCBfcG9wb3ZlckNhbmNlbFNob3dGbj86ICgpID0+IHZvaWQ7XG5cbiAgcHJvdGVjdGVkIF9kZWxheVRpbWVvdXRJZD86IG51bWJlcjtcblxuICBwcml2YXRlIF9wb3BvdmVyOiBDb21wb25lbnRMb2FkZXI8UG9wb3ZlckNvbnRhaW5lckNvbXBvbmVudD47XG4gIHByaXZhdGUgX2lzSW5pdGVkID0gZmFsc2U7XG4gIHByaXZhdGUgX2FyaWFEZXNjcmliZWRieT86IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihcbiAgICBfY29uZmlnOiBQb3BvdmVyQ29uZmlnLFxuICAgIHByaXZhdGUgX2VsZW1lbnRSZWY6IEVsZW1lbnRSZWYsXG4gICAgcHJpdmF0ZSBfcmVuZGVyZXI6IFJlbmRlcmVyMixcbiAgICBfdmlld0NvbnRhaW5lclJlZjogVmlld0NvbnRhaW5lclJlZixcbiAgICBjaXM6IENvbXBvbmVudExvYWRlckZhY3RvcnksXG4gICAgcHJpdmF0ZSBfcG9zaXRpb25TZXJ2aWNlOiBQb3NpdGlvbmluZ1NlcnZpY2VcbiAgKSB7XG4gICAgdGhpcy5fcG9wb3ZlciA9IGNpc1xuICAgICAgLmNyZWF0ZUxvYWRlcjxQb3BvdmVyQ29udGFpbmVyQ29tcG9uZW50PihfZWxlbWVudFJlZiwgX3ZpZXdDb250YWluZXJSZWYsIF9yZW5kZXJlcilcbiAgICAgIC5wcm92aWRlKHsgcHJvdmlkZTogUG9wb3ZlckNvbmZpZywgdXNlVmFsdWU6IF9jb25maWcgfSk7XG5cbiAgICBPYmplY3QuYXNzaWduKHRoaXMsIF9jb25maWcpO1xuXG4gICAgdGhpcy5vblNob3duID0gdGhpcy5fcG9wb3Zlci5vblNob3duO1xuICAgIHRoaXMub25IaWRkZW4gPSB0aGlzLl9wb3BvdmVyLm9uSGlkZGVuO1xuXG4gICAgLy8gZml4OiBubyBmb2N1cyBvbiBidXR0b24gb24gTWFjIE9TICMxNzk1XG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBfZWxlbWVudFJlZi5uYXRpdmVFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIF9lbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnQuZm9jdXMoKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0IGF0dHJpYnV0ZSBhcmlhLWRlc2NyaWJlZEJ5IGZvciBlbGVtZW50IGRpcmVjdGl2ZSBhbmRcbiAgICogc2V0IGlkIGZvciB0aGUgcG9wb3ZlclxuICAgKi9cbiAgc2V0QXJpYURlc2NyaWJlZEJ5KCk6IHZvaWQge1xuICAgIHRoaXMuX2FyaWFEZXNjcmliZWRieSA9IHRoaXMuaXNPcGVuID8gYG5neC1wb3BvdmVyLSR7dGhpcy5wb3BvdmVySWR9YCA6IHZvaWQgMDtcbiAgICBpZiAodGhpcy5fYXJpYURlc2NyaWJlZGJ5KSB7XG4gICAgICBpZiAodGhpcy5fcG9wb3Zlci5pbnN0YW5jZSkge1xuICAgICAgICB0aGlzLl9wb3BvdmVyLmluc3RhbmNlLnBvcG92ZXJJZCA9IHRoaXMuX2FyaWFEZXNjcmliZWRieTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX3JlbmRlcmVyLnNldEF0dHJpYnV0ZSh0aGlzLl9lbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnQsICdhcmlhLWRlc2NyaWJlZGJ5JywgdGhpcy5fYXJpYURlc2NyaWJlZGJ5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fcmVuZGVyZXIucmVtb3ZlQXR0cmlidXRlKHRoaXMuX2VsZW1lbnRSZWYubmF0aXZlRWxlbWVudCwgJ2FyaWEtZGVzY3JpYmVkYnknKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogT3BlbnMgYW4gZWxlbWVudOKAmXMgcG9wb3Zlci4gVGhpcyBpcyBjb25zaWRlcmVkIGEg4oCcbWFudWFs4oCdIHRyaWdnZXJpbmcgb2ZcbiAgICogdGhlIHBvcG92ZXIuXG4gICAqL1xuICBzaG93KCk6IHZvaWQge1xuICAgIGlmICh0aGlzLl9wb3BvdmVyLmlzU2hvd24gfHwgIXRoaXMucG9wb3ZlciB8fCB0aGlzLl9kZWxheVRpbWVvdXRJZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuX3Bvc2l0aW9uU2VydmljZS5zZXRPcHRpb25zKHtcbiAgICAgIG1vZGlmaWVyczoge1xuICAgICAgICBmbGlwOiB7XG4gICAgICAgICAgZW5hYmxlZDogdGhpcy5hZGFwdGl2ZVBvc2l0aW9uXG4gICAgICAgIH0sXG4gICAgICAgIHByZXZlbnRPdmVyZmxvdzoge1xuICAgICAgICAgIGVuYWJsZWQ6IHRoaXMuYWRhcHRpdmVQb3NpdGlvbixcbiAgICAgICAgICBib3VuZGFyaWVzRWxlbWVudDogdGhpcy5ib3VuZGFyaWVzRWxlbWVudCB8fCAnc2Nyb2xsUGFyZW50J1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCBzaG93UG9wb3ZlciA9ICgpID0+IHtcbiAgICAgIGlmICh0aGlzLl9kZWxheVRpbWVvdXRJZCkge1xuICAgICAgICB0aGlzLl9kZWxheVRpbWVvdXRJZCA9IHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fcG9wb3Zlci5hdHRhY2goUG9wb3ZlckNvbnRhaW5lckNvbXBvbmVudCkudG8odGhpcy5jb250YWluZXIpLnBvc2l0aW9uKHsgYXR0YWNobWVudDogdGhpcy5wbGFjZW1lbnQgfSkuc2hvdyh7XG4gICAgICAgIGNvbnRlbnQ6IHRoaXMucG9wb3ZlcixcbiAgICAgICAgY29udGV4dDogdGhpcy5wb3BvdmVyQ29udGV4dCxcbiAgICAgICAgcGxhY2VtZW50OiB0aGlzLnBsYWNlbWVudCxcbiAgICAgICAgdGl0bGU6IHRoaXMucG9wb3ZlclRpdGxlLFxuICAgICAgICBjb250YWluZXJDbGFzczogdGhpcy5jb250YWluZXJDbGFzc1xuICAgICAgfSk7XG5cbiAgICAgIGlmICghdGhpcy5hZGFwdGl2ZVBvc2l0aW9uICYmIHRoaXMuX3BvcG92ZXIuX2NvbXBvbmVudFJlZikge1xuICAgICAgICB0aGlzLl9wb3NpdGlvblNlcnZpY2UuY2FsY1Bvc2l0aW9uKCk7XG4gICAgICAgIHRoaXMuX3Bvc2l0aW9uU2VydmljZS5kZWxldGVQb3NpdGlvbkVsZW1lbnQodGhpcy5fcG9wb3Zlci5fY29tcG9uZW50UmVmLmxvY2F0aW9uKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5pc09wZW4gPSB0cnVlO1xuICAgICAgdGhpcy5zZXRBcmlhRGVzY3JpYmVkQnkoKTtcbiAgICB9O1xuXG4gICAgY29uc3QgY2FuY2VsRGVsYXllZFRvb2x0aXBTaG93aW5nID0gKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuX3BvcG92ZXJDYW5jZWxTaG93Rm4pIHtcbiAgICAgICAgdGhpcy5fcG9wb3ZlckNhbmNlbFNob3dGbigpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAodGhpcy5kZWxheSkge1xuICAgICAgY29uc3QgX3RpbWVyID0gdGltZXIodGhpcy5kZWxheSkuc3Vic2NyaWJlKCgpID0+IHtcbiAgICAgICAgc2hvd1BvcG92ZXIoKTtcbiAgICAgICAgY2FuY2VsRGVsYXllZFRvb2x0aXBTaG93aW5nKCk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHRoaXMudHJpZ2dlcnMpIHtcbiAgICAgICAgcGFyc2VUcmlnZ2Vycyh0aGlzLnRyaWdnZXJzKS5mb3JFYWNoKCh0cmlnZ2VyOiBUcmlnZ2VyKSA9PiB7XG4gICAgICAgICAgaWYgKCF0cmlnZ2VyLmNsb3NlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdGhpcy5fcG9wb3ZlckNhbmNlbFNob3dGbiA9IHRoaXMuX3JlbmRlcmVyLmxpc3Rlbih0aGlzLl9lbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnQsIHRyaWdnZXIuY2xvc2UsICgpID0+IHtcbiAgICAgICAgICAgIF90aW1lci51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgY2FuY2VsRGVsYXllZFRvb2x0aXBTaG93aW5nKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzaG93UG9wb3ZlcigpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgYW4gZWxlbWVudOKAmXMgcG9wb3Zlci4gVGhpcyBpcyBjb25zaWRlcmVkIGEg4oCcbWFudWFs4oCdIHRyaWdnZXJpbmcgb2ZcbiAgICogdGhlIHBvcG92ZXIuXG4gICAqL1xuICBoaWRlKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLl9kZWxheVRpbWVvdXRJZCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuX2RlbGF5VGltZW91dElkKTtcbiAgICAgIHRoaXMuX2RlbGF5VGltZW91dElkID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmlzT3Blbikge1xuICAgICAgdGhpcy5fcG9wb3Zlci5oaWRlKCk7XG4gICAgICB0aGlzLnNldEFyaWFEZXNjcmliZWRCeSgpO1xuICAgICAgdGhpcy5pc09wZW4gPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVG9nZ2xlcyBhbiBlbGVtZW504oCZcyBwb3BvdmVyLiBUaGlzIGlzIGNvbnNpZGVyZWQgYSDigJxtYW51YWzigJ0gdHJpZ2dlcmluZyBvZlxuICAgKiB0aGUgcG9wb3Zlci5cbiAgICovXG4gIHRvZ2dsZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5pc09wZW4pIHtcbiAgICAgIHJldHVybiB0aGlzLmhpZGUoKTtcbiAgICB9XG5cbiAgICB0aGlzLnNob3coKTtcbiAgfVxuXG4gIG5nT25Jbml0KCk6IHZvaWQge1xuICAgIC8vIGZpeDogc2VlbXMgdGhlcmUgYXJlIGFuIGlzc3VlIHdpdGggYHJvdXRlckxpbmtBY3RpdmVgXG4gICAgLy8gd2hpY2ggcmVzdWx0IGluIGR1cGxpY2F0ZWQgY2FsbCBuZ09uSW5pdCB3aXRob3V0IGNhbGwgdG8gbmdPbkRlc3Ryb3lcbiAgICAvLyByZWFkIG1vcmU6IGh0dHBzOi8vZ2l0aHViLmNvbS92YWxvci1zb2Z0d2FyZS9uZ3gtYm9vdHN0cmFwL2lzc3Vlcy8xODg1XG4gICAgaWYgKHRoaXMuX2lzSW5pdGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX2lzSW5pdGVkID0gdHJ1ZTtcblxuICAgIHRoaXMuX3BvcG92ZXIubGlzdGVuKHtcbiAgICAgIHRyaWdnZXJzOiB0aGlzLnRyaWdnZXJzLFxuICAgICAgb3V0c2lkZUNsaWNrOiB0aGlzLm91dHNpZGVDbGljayxcbiAgICAgIHNob3c6ICgpID0+IHRoaXMuc2hvdygpLFxuICAgICAgaGlkZTogKCkgPT4gdGhpcy5oaWRlKClcbiAgICB9KTtcbiAgfVxuXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMuX3BvcG92ZXIuZGlzcG9zZSgpO1xuICB9XG59XG4iXX0=