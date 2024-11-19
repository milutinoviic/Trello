import { Directive, TemplateRef } from '@angular/core';
import { TabDirective } from './tab.directive';
import * as i0 from "@angular/core";
import * as i1 from "./tab.directive";
/** Should be used to mark <ng-template> element as a template for tab heading */
export class TabHeadingDirective {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(templateRef, tab) {
        tab.headingRef = templateRef;
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: TabHeadingDirective, deps: [{ token: i0.TemplateRef }, { token: i1.TabDirective }], target: i0.ɵɵFactoryTarget.Directive }); }
    static { this.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "18.0.1", type: TabHeadingDirective, isStandalone: true, selector: "[tabHeading]", ngImport: i0 }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: TabHeadingDirective, decorators: [{
            type: Directive,
            args: [{
                    selector: '[tabHeading]',
                    standalone: true
                }]
        }], ctorParameters: () => [{ type: i0.TemplateRef }, { type: i1.TabDirective }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFiLWhlYWRpbmcuZGlyZWN0aXZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3RhYnMvdGFiLWhlYWRpbmcuZGlyZWN0aXZlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBRXZELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQzs7O0FBRS9DLGlGQUFpRjtBQUtqRixNQUFNLE9BQU8sbUJBQW1CO0lBSTlCLDhEQUE4RDtJQUM5RCxZQUFZLFdBQTZCLEVBQUUsR0FBaUI7UUFDMUQsR0FBRyxDQUFDLFVBQVUsR0FBRyxXQUFXLENBQUM7SUFDL0IsQ0FBQzs4R0FQVSxtQkFBbUI7a0dBQW5CLG1CQUFtQjs7MkZBQW5CLG1CQUFtQjtrQkFKL0IsU0FBUzttQkFBQztvQkFDUCxRQUFRLEVBQUUsY0FBYztvQkFDeEIsVUFBVSxFQUFFLElBQUk7aUJBQ25CIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRGlyZWN0aXZlLCBUZW1wbGF0ZVJlZiB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQgeyBUYWJEaXJlY3RpdmUgfSBmcm9tICcuL3RhYi5kaXJlY3RpdmUnO1xuXG4vKiogU2hvdWxkIGJlIHVzZWQgdG8gbWFyayA8bmctdGVtcGxhdGU+IGVsZW1lbnQgYXMgYSB0ZW1wbGF0ZSBmb3IgdGFiIGhlYWRpbmcgKi9cbkBEaXJlY3RpdmUoe1xuICAgIHNlbGVjdG9yOiAnW3RhYkhlYWRpbmddJyxcbiAgICBzdGFuZGFsb25lOiB0cnVlXG59KVxuZXhwb3J0IGNsYXNzIFRhYkhlYWRpbmdEaXJlY3RpdmUge1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICB0ZW1wbGF0ZVJlZj86IFRlbXBsYXRlUmVmPGFueT47XG5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgY29uc3RydWN0b3IodGVtcGxhdGVSZWY6IFRlbXBsYXRlUmVmPGFueT4sIHRhYjogVGFiRGlyZWN0aXZlKSB7XG4gICAgdGFiLmhlYWRpbmdSZWYgPSB0ZW1wbGF0ZVJlZjtcbiAgfVxufVxuIl19