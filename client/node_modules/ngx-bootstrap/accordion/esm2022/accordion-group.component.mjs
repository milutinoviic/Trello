import { Component, HostBinding, Inject, Input, Output, EventEmitter } from '@angular/core';
import { AccordionComponent } from './accordion.component';
import { CollapseModule } from 'ngx-bootstrap/collapse';
import { NgClass, NgIf } from '@angular/common';
import * as i0 from "@angular/core";
import * as i1 from "ngx-bootstrap/collapse";
import * as i2 from "./accordion.component";
/**
 * ### Accordion heading
 * Instead of using `heading` attribute on the `accordion-group`, you can use
 * an `accordion-heading` attribute on `any` element inside of a group that
 * will be used as group's header template.
 */
export class AccordionPanelComponent {
    // Questionable, maybe .panel-open should be on child div.panel element?
    /** Is accordion group open or closed. This property supports two-way binding */
    get isOpen() {
        return this._isOpen;
    }
    set isOpen(value) {
        if (value !== this.isOpen) {
            if (value) {
                this.accordion.closeOtherPanels(this);
            }
            this._isOpen = value;
            Promise.resolve(null)
                .then(() => {
                this.isOpenChange.emit(value);
            });
        }
    }
    constructor(accordion) {
        /** turn on/off animation */
        this.isAnimated = false;
        /** Provides an ability to use Bootstrap's contextual panel classes
         * (`panel-primary`, `panel-success`, `panel-info`, etc...).
         * List of all available classes [available here]
         * (https://getbootstrap.com/docs/3.3/components/#panels-alternatives)
         */
        this.panelClass = 'panel-default';
        /** if <code>true</code> — disables accordion group */
        this.isDisabled = false;
        /** Emits when the opened state changes */
        this.isOpenChange = new EventEmitter();
        this._isOpen = false;
        this.accordion = accordion;
    }
    ngOnInit() {
        this.accordion.addGroup(this);
    }
    ngOnDestroy() {
        this.accordion.removeGroup(this);
    }
    toggleOpen() {
        if (!this.isDisabled) {
            this.isOpen = !this.isOpen;
        }
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: AccordionPanelComponent, deps: [{ token: AccordionComponent }], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "18.0.1", type: AccordionPanelComponent, isStandalone: true, selector: "accordion-group, accordion-panel", inputs: { heading: "heading", panelClass: "panelClass", isDisabled: "isDisabled", isOpen: "isOpen" }, outputs: { isOpenChange: "isOpenChange" }, host: { properties: { "class.panel-open": "this.isOpen" }, styleAttribute: "display: block", classAttribute: "panel" }, ngImport: i0, template: "<div class=\"panel card\" [ngClass]=\"panelClass\">\n  <div\n    class=\"panel-heading card-header\"\n    role=\"tab\"\n    (click)=\"toggleOpen()\"\n    [ngClass]=\"isDisabled ? 'panel-disabled' : 'panel-enabled'\"\n  >\n    <div class=\"panel-title\">\n      <div role=\"button\" class=\"accordion-toggle\" [attr.aria-expanded]=\"isOpen\">\n        <button class=\"btn btn-link\" *ngIf=\"heading\" [ngClass]=\"{ 'text-muted': isDisabled }\" type=\"button\">\n          {{ heading }}\n        </button>\n        <ng-content select=\"[accordion-heading]\"></ng-content>\n      </div>\n    </div>\n  </div>\n  <div class=\"panel-collapse collapse\" role=\"tabpanel\" [collapse]=\"!isOpen\" [isAnimated]=\"isAnimated\">\n    <div class=\"panel-body card-block card-body\">\n      <ng-content></ng-content>\n    </div>\n  </div>\n</div>\n", styles: [":host .card-header.panel-enabled{cursor:pointer}:host .card-header.panel-disabled .btn.btn-link{cursor:default;text-decoration:none}\n"], dependencies: [{ kind: "directive", type: NgClass, selector: "[ngClass]", inputs: ["class", "ngClass"] }, { kind: "directive", type: NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }, { kind: "ngmodule", type: CollapseModule }, { kind: "directive", type: i1.CollapseDirective, selector: "[collapse]", inputs: ["display", "isAnimated", "collapse"], outputs: ["collapsed", "collapses", "expanded", "expands"], exportAs: ["bs-collapse"] }] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: AccordionPanelComponent, decorators: [{
            type: Component,
            args: [{ selector: 'accordion-group, accordion-panel', host: {
                        class: 'panel',
                        style: 'display: block'
                    }, standalone: true, imports: [NgClass, NgIf, CollapseModule], template: "<div class=\"panel card\" [ngClass]=\"panelClass\">\n  <div\n    class=\"panel-heading card-header\"\n    role=\"tab\"\n    (click)=\"toggleOpen()\"\n    [ngClass]=\"isDisabled ? 'panel-disabled' : 'panel-enabled'\"\n  >\n    <div class=\"panel-title\">\n      <div role=\"button\" class=\"accordion-toggle\" [attr.aria-expanded]=\"isOpen\">\n        <button class=\"btn btn-link\" *ngIf=\"heading\" [ngClass]=\"{ 'text-muted': isDisabled }\" type=\"button\">\n          {{ heading }}\n        </button>\n        <ng-content select=\"[accordion-heading]\"></ng-content>\n      </div>\n    </div>\n  </div>\n  <div class=\"panel-collapse collapse\" role=\"tabpanel\" [collapse]=\"!isOpen\" [isAnimated]=\"isAnimated\">\n    <div class=\"panel-body card-block card-body\">\n      <ng-content></ng-content>\n    </div>\n  </div>\n</div>\n", styles: [":host .card-header.panel-enabled{cursor:pointer}:host .card-header.panel-disabled .btn.btn-link{cursor:default;text-decoration:none}\n"] }]
        }], ctorParameters: () => [{ type: i2.AccordionComponent, decorators: [{
                    type: Inject,
                    args: [AccordionComponent]
                }] }], propDecorators: { heading: [{
                type: Input
            }], panelClass: [{
                type: Input
            }], isDisabled: [{
                type: Input
            }], isOpenChange: [{
                type: Output
            }], isOpen: [{
                type: HostBinding,
                args: ['class.panel-open']
            }, {
                type: Input
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjb3JkaW9uLWdyb3VwLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9hY2NvcmRpb24vYWNjb3JkaW9uLWdyb3VwLmNvbXBvbmVudC50cyIsIi4uLy4uLy4uLy4uL3NyYy9hY2NvcmRpb24vYWNjb3JkaW9uLWdyb3VwLmNvbXBvbmVudC5odG1sIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFDTCxTQUFTLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQXFCLE1BQU0sRUFBRSxZQUFZLEVBQy9FLE1BQU0sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzNELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlCQUFpQixDQUFDOzs7O0FBRWhEOzs7OztHQUtHO0FBYUgsTUFBTSxPQUFPLHVCQUF1QjtJQWdCbEMsd0VBQXdFO0lBQ3hFLGdGQUFnRjtJQUNoRixJQUVJLE1BQU07UUFDUixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7SUFDdEIsQ0FBQztJQUVELElBQUksTUFBTSxDQUFDLEtBQWM7UUFDdkIsSUFBSSxLQUFLLEtBQUssSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzFCLElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQ1YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN4QyxDQUFDO1lBQ0QsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7WUFDckIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7aUJBQ3BCLElBQUksQ0FBQyxHQUFHLEVBQUU7Z0JBQ1QsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQztJQUtELFlBQXdDLFNBQTZCO1FBdkNyRSw0QkFBNEI7UUFDNUIsZUFBVSxHQUFHLEtBQUssQ0FBQztRQUduQjs7OztXQUlHO1FBQ00sZUFBVSxHQUFHLGVBQWUsQ0FBQztRQUN0QyxzREFBc0Q7UUFDN0MsZUFBVSxHQUFHLEtBQUssQ0FBQztRQUM1QiwwQ0FBMEM7UUFDaEMsaUJBQVksR0FBMEIsSUFBSSxZQUFZLEVBQUUsQ0FBQztRQXVCekQsWUFBTyxHQUFHLEtBQUssQ0FBQztRQUl4QixJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztJQUM3QixDQUFDO0lBRUQsUUFBUTtRQUNOLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFFRCxXQUFXO1FBQ1QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUVELFVBQVU7UUFDUixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3JCLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQzdCLENBQUM7SUFDSCxDQUFDOzhHQXhEVSx1QkFBdUIsa0JBd0NkLGtCQUFrQjtrR0F4QzNCLHVCQUF1QixxV0N6QnBDLHEwQkFzQkEsZ01EQ2MsT0FBTyxvRkFBRSxJQUFJLDRGQUFFLGNBQWM7OzJGQUU5Qix1QkFBdUI7a0JBWm5DLFNBQVM7K0JBQ0ksa0NBQWtDLFFBR3RDO3dCQUNGLEtBQUssRUFBRSxPQUFPO3dCQUNkLEtBQUssRUFBRSxnQkFBZ0I7cUJBQzFCLGNBRVcsSUFBSSxXQUNQLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxjQUFjLENBQUM7OzBCQTBDN0IsTUFBTTsyQkFBQyxrQkFBa0I7eUNBcEM3QixPQUFPO3NCQUFmLEtBQUs7Z0JBTUcsVUFBVTtzQkFBbEIsS0FBSztnQkFFRyxVQUFVO3NCQUFsQixLQUFLO2dCQUVJLFlBQVk7c0JBQXJCLE1BQU07Z0JBTUgsTUFBTTtzQkFGVCxXQUFXO3VCQUFDLGtCQUFrQjs7c0JBQzlCLEtBQUsiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBDb21wb25lbnQsIEhvc3RCaW5kaW5nLCBJbmplY3QsIElucHV0LCBPbkRlc3Ryb3ksIE9uSW5pdCwgT3V0cHV0LCBFdmVudEVtaXR0ZXJcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBBY2NvcmRpb25Db21wb25lbnQgfSBmcm9tICcuL2FjY29yZGlvbi5jb21wb25lbnQnO1xuaW1wb3J0IHsgQ29sbGFwc2VNb2R1bGUgfSBmcm9tICduZ3gtYm9vdHN0cmFwL2NvbGxhcHNlJztcbmltcG9ydCB7IE5nQ2xhc3MsIE5nSWYgfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuXG4vKipcbiAqICMjIyBBY2NvcmRpb24gaGVhZGluZ1xuICogSW5zdGVhZCBvZiB1c2luZyBgaGVhZGluZ2AgYXR0cmlidXRlIG9uIHRoZSBgYWNjb3JkaW9uLWdyb3VwYCwgeW91IGNhbiB1c2VcbiAqIGFuIGBhY2NvcmRpb24taGVhZGluZ2AgYXR0cmlidXRlIG9uIGBhbnlgIGVsZW1lbnQgaW5zaWRlIG9mIGEgZ3JvdXAgdGhhdFxuICogd2lsbCBiZSB1c2VkIGFzIGdyb3VwJ3MgaGVhZGVyIHRlbXBsYXRlLlxuICovXG5AQ29tcG9uZW50KHtcbiAgICBzZWxlY3RvcjogJ2FjY29yZGlvbi1ncm91cCwgYWNjb3JkaW9uLXBhbmVsJyxcbiAgICB0ZW1wbGF0ZVVybDogJy4vYWNjb3JkaW9uLWdyb3VwLmNvbXBvbmVudC5odG1sJyxcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQGFuZ3VsYXItZXNsaW50L25vLWhvc3QtbWV0YWRhdGEtcHJvcGVydHlcbiAgICBob3N0OiB7XG4gICAgICAgIGNsYXNzOiAncGFuZWwnLFxuICAgICAgICBzdHlsZTogJ2Rpc3BsYXk6IGJsb2NrJ1xuICAgIH0sXG4gICAgc3R5bGVVcmxzOiBbJy4vYWNjb3JkaW9uLnNjc3MnXSxcbiAgICBzdGFuZGFsb25lOiB0cnVlLFxuICAgIGltcG9ydHM6IFtOZ0NsYXNzLCBOZ0lmLCBDb2xsYXBzZU1vZHVsZV1cbn0pXG5leHBvcnQgY2xhc3MgQWNjb3JkaW9uUGFuZWxDb21wb25lbnQgaW1wbGVtZW50cyBPbkluaXQsIE9uRGVzdHJveSB7XG4gIC8qKiB0dXJuIG9uL29mZiBhbmltYXRpb24gKi9cbiAgaXNBbmltYXRlZCA9IGZhbHNlO1xuICAvKiogQ2xpY2thYmxlIHRleHQgaW4gYWNjb3JkaW9uJ3MgZ3JvdXAgaGVhZGVyLCBjaGVjayBgYWNjb3JkaW9uIGhlYWRpbmdgIGJlbG93IGZvciB1c2luZyBodG1sIGluIGhlYWRlciAqL1xuICBASW5wdXQoKSBoZWFkaW5nITogc3RyaW5nO1xuICAvKiogUHJvdmlkZXMgYW4gYWJpbGl0eSB0byB1c2UgQm9vdHN0cmFwJ3MgY29udGV4dHVhbCBwYW5lbCBjbGFzc2VzXG4gICAqIChgcGFuZWwtcHJpbWFyeWAsIGBwYW5lbC1zdWNjZXNzYCwgYHBhbmVsLWluZm9gLCBldGMuLi4pLlxuICAgKiBMaXN0IG9mIGFsbCBhdmFpbGFibGUgY2xhc3NlcyBbYXZhaWxhYmxlIGhlcmVdXG4gICAqIChodHRwczovL2dldGJvb3RzdHJhcC5jb20vZG9jcy8zLjMvY29tcG9uZW50cy8jcGFuZWxzLWFsdGVybmF0aXZlcylcbiAgICovXG4gIEBJbnB1dCgpIHBhbmVsQ2xhc3MgPSAncGFuZWwtZGVmYXVsdCc7XG4gIC8qKiBpZiA8Y29kZT50cnVlPC9jb2RlPiDigJQgZGlzYWJsZXMgYWNjb3JkaW9uIGdyb3VwICovXG4gIEBJbnB1dCgpIGlzRGlzYWJsZWQgPSBmYWxzZTtcbiAgLyoqIEVtaXRzIHdoZW4gdGhlIG9wZW5lZCBzdGF0ZSBjaGFuZ2VzICovXG4gIEBPdXRwdXQoKSBpc09wZW5DaGFuZ2U6IEV2ZW50RW1pdHRlcjxib29sZWFuPiA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblxuICAvLyBRdWVzdGlvbmFibGUsIG1heWJlIC5wYW5lbC1vcGVuIHNob3VsZCBiZSBvbiBjaGlsZCBkaXYucGFuZWwgZWxlbWVudD9cbiAgLyoqIElzIGFjY29yZGlvbiBncm91cCBvcGVuIG9yIGNsb3NlZC4gVGhpcyBwcm9wZXJ0eSBzdXBwb3J0cyB0d28td2F5IGJpbmRpbmcgKi9cbiAgQEhvc3RCaW5kaW5nKCdjbGFzcy5wYW5lbC1vcGVuJylcbiAgQElucHV0KClcbiAgZ2V0IGlzT3BlbigpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5faXNPcGVuO1xuICB9XG5cbiAgc2V0IGlzT3Blbih2YWx1ZTogYm9vbGVhbikge1xuICAgIGlmICh2YWx1ZSAhPT0gdGhpcy5pc09wZW4pIHtcbiAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICB0aGlzLmFjY29yZGlvbi5jbG9zZU90aGVyUGFuZWxzKHRoaXMpO1xuICAgICAgfVxuICAgICAgdGhpcy5faXNPcGVuID0gdmFsdWU7XG4gICAgICBQcm9taXNlLnJlc29sdmUobnVsbClcbiAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgdGhpcy5pc09wZW5DaGFuZ2UuZW1pdCh2YWx1ZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgX2lzT3BlbiA9IGZhbHNlO1xuICBwcm90ZWN0ZWQgYWNjb3JkaW9uOiBBY2NvcmRpb25Db21wb25lbnQ7XG5cbiAgY29uc3RydWN0b3IoQEluamVjdChBY2NvcmRpb25Db21wb25lbnQpIGFjY29yZGlvbjogQWNjb3JkaW9uQ29tcG9uZW50KSB7XG4gICAgdGhpcy5hY2NvcmRpb24gPSBhY2NvcmRpb247XG4gIH1cblxuICBuZ09uSW5pdCgpOiB2b2lkIHtcbiAgICB0aGlzLmFjY29yZGlvbi5hZGRHcm91cCh0aGlzKTtcbiAgfVxuXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMuYWNjb3JkaW9uLnJlbW92ZUdyb3VwKHRoaXMpO1xuICB9XG5cbiAgdG9nZ2xlT3BlbigpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuaXNEaXNhYmxlZCkge1xuICAgICAgdGhpcy5pc09wZW4gPSAhdGhpcy5pc09wZW47XG4gICAgfVxuICB9XG59XG4iLCI8ZGl2IGNsYXNzPVwicGFuZWwgY2FyZFwiIFtuZ0NsYXNzXT1cInBhbmVsQ2xhc3NcIj5cbiAgPGRpdlxuICAgIGNsYXNzPVwicGFuZWwtaGVhZGluZyBjYXJkLWhlYWRlclwiXG4gICAgcm9sZT1cInRhYlwiXG4gICAgKGNsaWNrKT1cInRvZ2dsZU9wZW4oKVwiXG4gICAgW25nQ2xhc3NdPVwiaXNEaXNhYmxlZCA/ICdwYW5lbC1kaXNhYmxlZCcgOiAncGFuZWwtZW5hYmxlZCdcIlxuICA+XG4gICAgPGRpdiBjbGFzcz1cInBhbmVsLXRpdGxlXCI+XG4gICAgICA8ZGl2IHJvbGU9XCJidXR0b25cIiBjbGFzcz1cImFjY29yZGlvbi10b2dnbGVcIiBbYXR0ci5hcmlhLWV4cGFuZGVkXT1cImlzT3BlblwiPlxuICAgICAgICA8YnV0dG9uIGNsYXNzPVwiYnRuIGJ0bi1saW5rXCIgKm5nSWY9XCJoZWFkaW5nXCIgW25nQ2xhc3NdPVwieyAndGV4dC1tdXRlZCc6IGlzRGlzYWJsZWQgfVwiIHR5cGU9XCJidXR0b25cIj5cbiAgICAgICAgICB7eyBoZWFkaW5nIH19XG4gICAgICAgIDwvYnV0dG9uPlxuICAgICAgICA8bmctY29udGVudCBzZWxlY3Q9XCJbYWNjb3JkaW9uLWhlYWRpbmddXCI+PC9uZy1jb250ZW50PlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gIDwvZGl2PlxuICA8ZGl2IGNsYXNzPVwicGFuZWwtY29sbGFwc2UgY29sbGFwc2VcIiByb2xlPVwidGFicGFuZWxcIiBbY29sbGFwc2VdPVwiIWlzT3BlblwiIFtpc0FuaW1hdGVkXT1cImlzQW5pbWF0ZWRcIj5cbiAgICA8ZGl2IGNsYXNzPVwicGFuZWwtYm9keSBjYXJkLWJsb2NrIGNhcmQtYm9keVwiPlxuICAgICAgPG5nLWNvbnRlbnQ+PC9uZy1jb250ZW50PlxuICAgIDwvZGl2PlxuICA8L2Rpdj5cbjwvZGl2PlxuIl19