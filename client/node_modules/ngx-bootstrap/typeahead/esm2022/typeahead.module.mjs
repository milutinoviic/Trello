import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TypeaheadContainerComponent } from './typeahead-container.component';
import { TypeaheadDirective } from './typeahead.directive';
import * as i0 from "@angular/core";
export class TypeaheadModule {
    // @deprecated method not required anymore, will be deleted in v19.0.0
    static forRoot() {
        return {
            ngModule: TypeaheadModule,
            providers: []
        };
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: TypeaheadModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule }); }
    static { this.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "18.0.1", ngImport: i0, type: TypeaheadModule, imports: [CommonModule, TypeaheadContainerComponent, TypeaheadDirective], exports: [TypeaheadContainerComponent, TypeaheadDirective] }); }
    static { this.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: TypeaheadModule, imports: [CommonModule] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: TypeaheadModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: [CommonModule, TypeaheadContainerComponent, TypeaheadDirective],
                    exports: [TypeaheadContainerComponent, TypeaheadDirective]
                }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZWFoZWFkLm1vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy90eXBlYWhlYWQvdHlwZWFoZWFkLm1vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDL0MsT0FBTyxFQUF1QixRQUFRLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFFOUQsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7O0FBTTNELE1BQU0sT0FBTyxlQUFlO0lBQzFCLHNFQUFzRTtJQUN0RSxNQUFNLENBQUMsT0FBTztRQUNaLE9BQU87WUFDTCxRQUFRLEVBQUUsZUFBZTtZQUN6QixTQUFTLEVBQUUsRUFBRTtTQUNkLENBQUM7SUFDSixDQUFDOzhHQVBVLGVBQWU7K0dBQWYsZUFBZSxZQUhkLFlBQVksRUFBRSwyQkFBMkIsRUFBRSxrQkFBa0IsYUFDN0QsMkJBQTJCLEVBQUUsa0JBQWtCOytHQUVoRCxlQUFlLFlBSGQsWUFBWTs7MkZBR2IsZUFBZTtrQkFKM0IsUUFBUTttQkFBQztvQkFDTixPQUFPLEVBQUUsQ0FBQyxZQUFZLEVBQUUsMkJBQTJCLEVBQUUsa0JBQWtCLENBQUM7b0JBQ3hFLE9BQU8sRUFBRSxDQUFDLDJCQUEyQixFQUFFLGtCQUFrQixDQUFDO2lCQUM3RCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbW1vbk1vZHVsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQgeyBNb2R1bGVXaXRoUHJvdmlkZXJzLCBOZ01vZHVsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQgeyBUeXBlYWhlYWRDb250YWluZXJDb21wb25lbnQgfSBmcm9tICcuL3R5cGVhaGVhZC1jb250YWluZXIuY29tcG9uZW50JztcbmltcG9ydCB7IFR5cGVhaGVhZERpcmVjdGl2ZSB9IGZyb20gJy4vdHlwZWFoZWFkLmRpcmVjdGl2ZSc7XG5cbkBOZ01vZHVsZSh7XG4gICAgaW1wb3J0czogW0NvbW1vbk1vZHVsZSwgVHlwZWFoZWFkQ29udGFpbmVyQ29tcG9uZW50LCBUeXBlYWhlYWREaXJlY3RpdmVdLFxuICAgIGV4cG9ydHM6IFtUeXBlYWhlYWRDb250YWluZXJDb21wb25lbnQsIFR5cGVhaGVhZERpcmVjdGl2ZV1cbn0pXG5leHBvcnQgY2xhc3MgVHlwZWFoZWFkTW9kdWxlIHtcbiAgLy8gQGRlcHJlY2F0ZWQgbWV0aG9kIG5vdCByZXF1aXJlZCBhbnltb3JlLCB3aWxsIGJlIGRlbGV0ZWQgaW4gdjE5LjAuMFxuICBzdGF0aWMgZm9yUm9vdCgpOiBNb2R1bGVXaXRoUHJvdmlkZXJzPFR5cGVhaGVhZE1vZHVsZT4ge1xuICAgIHJldHVybiB7XG4gICAgICBuZ01vZHVsZTogVHlwZWFoZWFkTW9kdWxlLFxuICAgICAgcHJvdmlkZXJzOiBbXVxuICAgIH07XG4gIH1cbn1cbiJdfQ==