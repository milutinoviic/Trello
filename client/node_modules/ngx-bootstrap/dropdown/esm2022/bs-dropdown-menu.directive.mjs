import { Directive, TemplateRef, ViewContainerRef } from '@angular/core';
import { BsDropdownState } from './bs-dropdown.state';
import * as i0 from "@angular/core";
import * as i1 from "./bs-dropdown.state";
export class BsDropdownMenuDirective {
    constructor(_state, _viewContainer, _templateRef) {
        _state.resolveDropdownMenu({
            templateRef: _templateRef,
            viewContainer: _viewContainer
        });
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: BsDropdownMenuDirective, deps: [{ token: i1.BsDropdownState }, { token: i0.ViewContainerRef }, { token: i0.TemplateRef }], target: i0.ɵɵFactoryTarget.Directive }); }
    static { this.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "18.0.1", type: BsDropdownMenuDirective, isStandalone: true, selector: "[bsDropdownMenu],[dropdownMenu]", exportAs: ["bs-dropdown-menu"], ngImport: i0 }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: BsDropdownMenuDirective, decorators: [{
            type: Directive,
            args: [{
                    selector: '[bsDropdownMenu],[dropdownMenu]',
                    exportAs: 'bs-dropdown-menu',
                    standalone: true
                }]
        }], ctorParameters: () => [{ type: i1.BsDropdownState }, { type: i0.ViewContainerRef }, { type: i0.TemplateRef }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnMtZHJvcGRvd24tbWVudS5kaXJlY3RpdmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvZHJvcGRvd24vYnMtZHJvcGRvd24tbWVudS5kaXJlY3RpdmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDekUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFDOzs7QUFPdEQsTUFBTSxPQUFPLHVCQUF1QjtJQUNsQyxZQUNFLE1BQXVCLEVBQ3ZCLGNBQWdDLEVBQ2hDLFlBQWtEO1FBRWxELE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQztZQUN6QixXQUFXLEVBQUUsWUFBWTtZQUN6QixhQUFhLEVBQUUsY0FBYztTQUM5QixDQUFDLENBQUM7SUFDTCxDQUFDOzhHQVZVLHVCQUF1QjtrR0FBdkIsdUJBQXVCOzsyRkFBdkIsdUJBQXVCO2tCQUxuQyxTQUFTO21CQUFDO29CQUNULFFBQVEsRUFBRSxpQ0FBaUM7b0JBQzNDLFFBQVEsRUFBRSxrQkFBa0I7b0JBQzVCLFVBQVUsRUFBRSxJQUFJO2lCQUNqQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IERpcmVjdGl2ZSwgVGVtcGxhdGVSZWYsIFZpZXdDb250YWluZXJSZWYgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IEJzRHJvcGRvd25TdGF0ZSB9IGZyb20gJy4vYnMtZHJvcGRvd24uc3RhdGUnO1xuXG5ARGlyZWN0aXZlKHtcbiAgc2VsZWN0b3I6ICdbYnNEcm9wZG93bk1lbnVdLFtkcm9wZG93bk1lbnVdJyxcbiAgZXhwb3J0QXM6ICdicy1kcm9wZG93bi1tZW51JyxcbiAgc3RhbmRhbG9uZTogdHJ1ZVxufSlcbmV4cG9ydCBjbGFzcyBCc0Ryb3Bkb3duTWVudURpcmVjdGl2ZSB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIF9zdGF0ZTogQnNEcm9wZG93blN0YXRlLFxuICAgIF92aWV3Q29udGFpbmVyOiBWaWV3Q29udGFpbmVyUmVmLFxuICAgIF90ZW1wbGF0ZVJlZjogVGVtcGxhdGVSZWY8QnNEcm9wZG93bk1lbnVEaXJlY3RpdmU+XG4gICkge1xuICAgIF9zdGF0ZS5yZXNvbHZlRHJvcGRvd25NZW51KHtcbiAgICAgIHRlbXBsYXRlUmVmOiBfdGVtcGxhdGVSZWYsXG4gICAgICB2aWV3Q29udGFpbmVyOiBfdmlld0NvbnRhaW5lclxuICAgIH0pO1xuICB9XG59XG4iXX0=