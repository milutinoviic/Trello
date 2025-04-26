import { NgModule } from '@angular/core';
import { BsDropdownContainerComponent } from './bs-dropdown-container.component';
import { BsDropdownMenuDirective } from './bs-dropdown-menu.directive';
import { BsDropdownToggleDirective } from './bs-dropdown-toggle.directive';
import { BsDropdownDirective } from './bs-dropdown.directive';
import * as i0 from "@angular/core";
export class BsDropdownModule {
    // @deprecated method not required anymore, will be deleted in v19.0.0
    static forRoot() {
        return {
            ngModule: BsDropdownModule,
            providers: []
        };
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: BsDropdownModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule }); }
    static { this.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "18.0.1", ngImport: i0, type: BsDropdownModule, imports: [BsDropdownDirective,
            BsDropdownContainerComponent,
            BsDropdownMenuDirective,
            BsDropdownToggleDirective], exports: [BsDropdownMenuDirective,
            BsDropdownToggleDirective,
            BsDropdownDirective] }); }
    static { this.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: BsDropdownModule }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: BsDropdownModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: [
                        BsDropdownDirective,
                        BsDropdownContainerComponent,
                        BsDropdownMenuDirective,
                        BsDropdownToggleDirective
                    ],
                    exports: [
                        BsDropdownMenuDirective,
                        BsDropdownToggleDirective,
                        BsDropdownDirective
                    ]
                }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnMtZHJvcGRvd24ubW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2Ryb3Bkb3duL2JzLWRyb3Bkb3duLm1vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQXVCLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUU5RCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN2RSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUUzRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQzs7QUFlOUQsTUFBTSxPQUFPLGdCQUFnQjtJQUMzQixzRUFBc0U7SUFDdEUsTUFBTSxDQUFDLE9BQU87UUFDWixPQUFPO1lBQ0wsUUFBUSxFQUFFLGdCQUFnQjtZQUMxQixTQUFTLEVBQUUsRUFBRTtTQUNkLENBQUM7SUFDSixDQUFDOzhHQVBVLGdCQUFnQjsrR0FBaEIsZ0JBQWdCLFlBWHZCLG1CQUFtQjtZQUNuQiw0QkFBNEI7WUFDNUIsdUJBQXVCO1lBQ3ZCLHlCQUF5QixhQUd2Qix1QkFBdUI7WUFDdkIseUJBQXlCO1lBQ3pCLG1CQUFtQjsrR0FHZCxnQkFBZ0I7OzJGQUFoQixnQkFBZ0I7a0JBYjVCLFFBQVE7bUJBQUM7b0JBQ04sT0FBTyxFQUFFO3dCQUNQLG1CQUFtQjt3QkFDbkIsNEJBQTRCO3dCQUM1Qix1QkFBdUI7d0JBQ3ZCLHlCQUF5QjtxQkFDMUI7b0JBQ0QsT0FBTyxFQUFFO3dCQUNMLHVCQUF1Qjt3QkFDdkIseUJBQXlCO3dCQUN6QixtQkFBbUI7cUJBQ3RCO2lCQUNKIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTW9kdWxlV2l0aFByb3ZpZGVycywgTmdNb2R1bGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuaW1wb3J0IHsgQnNEcm9wZG93bkNvbnRhaW5lckNvbXBvbmVudCB9IGZyb20gJy4vYnMtZHJvcGRvd24tY29udGFpbmVyLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBCc0Ryb3Bkb3duTWVudURpcmVjdGl2ZSB9IGZyb20gJy4vYnMtZHJvcGRvd24tbWVudS5kaXJlY3RpdmUnO1xuaW1wb3J0IHsgQnNEcm9wZG93blRvZ2dsZURpcmVjdGl2ZSB9IGZyb20gJy4vYnMtZHJvcGRvd24tdG9nZ2xlLmRpcmVjdGl2ZSc7XG5cbmltcG9ydCB7IEJzRHJvcGRvd25EaXJlY3RpdmUgfSBmcm9tICcuL2JzLWRyb3Bkb3duLmRpcmVjdGl2ZSc7XG5cbkBOZ01vZHVsZSh7XG4gICAgaW1wb3J0czogW1xuICAgICAgQnNEcm9wZG93bkRpcmVjdGl2ZSxcbiAgICAgIEJzRHJvcGRvd25Db250YWluZXJDb21wb25lbnQsXG4gICAgICBCc0Ryb3Bkb3duTWVudURpcmVjdGl2ZSxcbiAgICAgIEJzRHJvcGRvd25Ub2dnbGVEaXJlY3RpdmVcbiAgICBdLFxuICAgIGV4cG9ydHM6IFtcbiAgICAgICAgQnNEcm9wZG93bk1lbnVEaXJlY3RpdmUsXG4gICAgICAgIEJzRHJvcGRvd25Ub2dnbGVEaXJlY3RpdmUsXG4gICAgICAgIEJzRHJvcGRvd25EaXJlY3RpdmVcbiAgICBdXG59KVxuZXhwb3J0IGNsYXNzIEJzRHJvcGRvd25Nb2R1bGUge1xuICAvLyBAZGVwcmVjYXRlZCBtZXRob2Qgbm90IHJlcXVpcmVkIGFueW1vcmUsIHdpbGwgYmUgZGVsZXRlZCBpbiB2MTkuMC4wXG4gIHN0YXRpYyBmb3JSb290KCk6IE1vZHVsZVdpdGhQcm92aWRlcnM8QnNEcm9wZG93bk1vZHVsZT4ge1xuICAgIHJldHVybiB7XG4gICAgICBuZ01vZHVsZTogQnNEcm9wZG93bk1vZHVsZSxcbiAgICAgIHByb3ZpZGVyczogW11cbiAgICB9O1xuICB9XG59XG4iXX0=