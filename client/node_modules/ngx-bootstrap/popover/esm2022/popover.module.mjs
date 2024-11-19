import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopoverDirective } from './popover.directive';
import { PopoverContainerComponent } from './popover-container.component';
import * as i0 from "@angular/core";
export class PopoverModule {
    // @deprecated method not required anymore, will be deleted in v19.0.0
    static forRoot() {
        return {
            ngModule: PopoverModule,
            providers: []
        };
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: PopoverModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule }); }
    static { this.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "18.0.1", ngImport: i0, type: PopoverModule, imports: [CommonModule, PopoverDirective, PopoverContainerComponent], exports: [PopoverDirective] }); }
    static { this.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: PopoverModule, imports: [CommonModule] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: PopoverModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: [CommonModule, PopoverDirective, PopoverContainerComponent],
                    exports: [PopoverDirective]
                }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wb3Zlci5tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvcG9wb3Zlci9wb3BvdmVyLm1vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQXVCLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUM5RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFL0MsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDdkQsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sK0JBQStCLENBQUM7O0FBTTFFLE1BQU0sT0FBTyxhQUFhO0lBQ3hCLHNFQUFzRTtJQUN0RSxNQUFNLENBQUMsT0FBTztRQUNaLE9BQU87WUFDTCxRQUFRLEVBQUUsYUFBYTtZQUN2QixTQUFTLEVBQUUsRUFBRTtTQUNkLENBQUM7SUFDSixDQUFDOzhHQVBVLGFBQWE7K0dBQWIsYUFBYSxZQUhaLFlBQVksRUFBRSxnQkFBZ0IsRUFBRSx5QkFBeUIsYUFDekQsZ0JBQWdCOytHQUVqQixhQUFhLFlBSFosWUFBWTs7MkZBR2IsYUFBYTtrQkFKekIsUUFBUTttQkFBQztvQkFDTixPQUFPLEVBQUUsQ0FBQyxZQUFZLEVBQUUsZ0JBQWdCLEVBQUUseUJBQXlCLENBQUM7b0JBQ3BFLE9BQU8sRUFBRSxDQUFDLGdCQUFnQixDQUFDO2lCQUM5QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1vZHVsZVdpdGhQcm92aWRlcnMsIE5nTW9kdWxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBDb21tb25Nb2R1bGUgfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuXG5pbXBvcnQgeyBQb3BvdmVyRGlyZWN0aXZlIH0gZnJvbSAnLi9wb3BvdmVyLmRpcmVjdGl2ZSc7XG5pbXBvcnQgeyBQb3BvdmVyQ29udGFpbmVyQ29tcG9uZW50IH0gZnJvbSAnLi9wb3BvdmVyLWNvbnRhaW5lci5jb21wb25lbnQnO1xuXG5ATmdNb2R1bGUoe1xuICAgIGltcG9ydHM6IFtDb21tb25Nb2R1bGUsIFBvcG92ZXJEaXJlY3RpdmUsIFBvcG92ZXJDb250YWluZXJDb21wb25lbnRdLFxuICAgIGV4cG9ydHM6IFtQb3BvdmVyRGlyZWN0aXZlXVxufSlcbmV4cG9ydCBjbGFzcyBQb3BvdmVyTW9kdWxlIHtcbiAgLy8gQGRlcHJlY2F0ZWQgbWV0aG9kIG5vdCByZXF1aXJlZCBhbnltb3JlLCB3aWxsIGJlIGRlbGV0ZWQgaW4gdjE5LjAuMFxuICBzdGF0aWMgZm9yUm9vdCgpOiBNb2R1bGVXaXRoUHJvdmlkZXJzPFBvcG92ZXJNb2R1bGU+IHtcbiAgICByZXR1cm4ge1xuICAgICAgbmdNb2R1bGU6IFBvcG92ZXJNb2R1bGUsXG4gICAgICBwcm92aWRlcnM6IFtdXG4gICAgfTtcbiAgfVxufVxuIl19