import { NgModule } from '@angular/core';
import { FocusTrapModule } from 'ngx-bootstrap/focus-trap';
import { ModalBackdropComponent } from './modal-backdrop.component';
import { ModalDirective } from './modal.directive';
import { ModalContainerComponent } from './modal-container.component';
import { BsModalService } from './bs-modal.service';
import { ComponentLoaderFactory } from 'ngx-bootstrap/component-loader';
import { PositioningService } from 'ngx-bootstrap/positioning';
import * as i0 from "@angular/core";
export class ModalModule {
    // @deprecated method not required anymore, will be deleted in v19.0.0
    static forRoot() {
        return {
            ngModule: ModalModule,
            providers: [BsModalService, ComponentLoaderFactory, PositioningService]
        };
    }
    // @deprecated method not required anymore, will be deleted in v19.0.0
    static forChild() {
        return {
            ngModule: ModalModule,
            providers: [BsModalService, ComponentLoaderFactory, PositioningService]
        };
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: ModalModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule }); }
    static { this.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "18.0.1", ngImport: i0, type: ModalModule, imports: [FocusTrapModule,
            ModalBackdropComponent,
            ModalDirective,
            ModalContainerComponent], exports: [ModalBackdropComponent, ModalDirective] }); }
    static { this.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: ModalModule, imports: [FocusTrapModule] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: ModalModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: [
                        FocusTrapModule,
                        ModalBackdropComponent,
                        ModalDirective,
                        ModalContainerComponent
                    ],
                    exports: [ModalBackdropComponent, ModalDirective]
                }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kYWwubW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL21vZGFsL21vZGFsLm1vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQXVCLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUU5RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFM0QsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDcEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ25ELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3RFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNwRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQzs7QUFXL0QsTUFBTSxPQUFPLFdBQVc7SUFDdEIsc0VBQXNFO0lBQ3RFLE1BQU0sQ0FBQyxPQUFPO1FBQ1osT0FBTztZQUNMLFFBQVEsRUFBRSxXQUFXO1lBQ3JCLFNBQVMsRUFBRSxDQUFDLGNBQWMsRUFBRSxzQkFBc0IsRUFBRSxrQkFBa0IsQ0FBQztTQUN4RSxDQUFDO0lBQ0osQ0FBQztJQUVELHNFQUFzRTtJQUN0RSxNQUFNLENBQUMsUUFBUTtRQUNiLE9BQU87WUFDTCxRQUFRLEVBQUUsV0FBVztZQUNyQixTQUFTLEVBQUUsQ0FBQyxjQUFjLEVBQUUsc0JBQXNCLEVBQUUsa0JBQWtCLENBQUM7U0FDeEUsQ0FBQztJQUNKLENBQUM7OEdBZlUsV0FBVzsrR0FBWCxXQUFXLFlBUGxCLGVBQWU7WUFDZixzQkFBc0I7WUFDdEIsY0FBYztZQUNkLHVCQUF1QixhQUVmLHNCQUFzQixFQUFFLGNBQWM7K0dBRXZDLFdBQVcsWUFQbEIsZUFBZTs7MkZBT1IsV0FBVztrQkFUdkIsUUFBUTttQkFBQztvQkFDTixPQUFPLEVBQUU7d0JBQ1AsZUFBZTt3QkFDZixzQkFBc0I7d0JBQ3RCLGNBQWM7d0JBQ2QsdUJBQXVCO3FCQUN4QjtvQkFDRCxPQUFPLEVBQUUsQ0FBQyxzQkFBc0IsRUFBRSxjQUFjLENBQUM7aUJBQ3BEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTW9kdWxlV2l0aFByb3ZpZGVycywgTmdNb2R1bGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuaW1wb3J0IHsgRm9jdXNUcmFwTW9kdWxlIH0gZnJvbSAnbmd4LWJvb3RzdHJhcC9mb2N1cy10cmFwJztcblxuaW1wb3J0IHsgTW9kYWxCYWNrZHJvcENvbXBvbmVudCB9IGZyb20gJy4vbW9kYWwtYmFja2Ryb3AuY29tcG9uZW50JztcbmltcG9ydCB7IE1vZGFsRGlyZWN0aXZlIH0gZnJvbSAnLi9tb2RhbC5kaXJlY3RpdmUnO1xuaW1wb3J0IHsgTW9kYWxDb250YWluZXJDb21wb25lbnQgfSBmcm9tICcuL21vZGFsLWNvbnRhaW5lci5jb21wb25lbnQnO1xuaW1wb3J0IHsgQnNNb2RhbFNlcnZpY2UgfSBmcm9tICcuL2JzLW1vZGFsLnNlcnZpY2UnO1xuaW1wb3J0IHsgQ29tcG9uZW50TG9hZGVyRmFjdG9yeSB9IGZyb20gJ25neC1ib290c3RyYXAvY29tcG9uZW50LWxvYWRlcic7XG5pbXBvcnQgeyBQb3NpdGlvbmluZ1NlcnZpY2UgfSBmcm9tICduZ3gtYm9vdHN0cmFwL3Bvc2l0aW9uaW5nJztcblxuQE5nTW9kdWxlKHtcbiAgICBpbXBvcnRzOiBbXG4gICAgICBGb2N1c1RyYXBNb2R1bGUsXG4gICAgICBNb2RhbEJhY2tkcm9wQ29tcG9uZW50LFxuICAgICAgTW9kYWxEaXJlY3RpdmUsXG4gICAgICBNb2RhbENvbnRhaW5lckNvbXBvbmVudFxuICAgIF0sXG4gICAgZXhwb3J0czogW01vZGFsQmFja2Ryb3BDb21wb25lbnQsIE1vZGFsRGlyZWN0aXZlXVxufSlcbmV4cG9ydCBjbGFzcyBNb2RhbE1vZHVsZSB7XG4gIC8vIEBkZXByZWNhdGVkIG1ldGhvZCBub3QgcmVxdWlyZWQgYW55bW9yZSwgd2lsbCBiZSBkZWxldGVkIGluIHYxOS4wLjBcbiAgc3RhdGljIGZvclJvb3QoKTogTW9kdWxlV2l0aFByb3ZpZGVyczxNb2RhbE1vZHVsZT4ge1xuICAgIHJldHVybiB7XG4gICAgICBuZ01vZHVsZTogTW9kYWxNb2R1bGUsXG4gICAgICBwcm92aWRlcnM6IFtCc01vZGFsU2VydmljZSwgQ29tcG9uZW50TG9hZGVyRmFjdG9yeSwgUG9zaXRpb25pbmdTZXJ2aWNlXVxuICAgIH07XG4gIH1cblxuICAvLyBAZGVwcmVjYXRlZCBtZXRob2Qgbm90IHJlcXVpcmVkIGFueW1vcmUsIHdpbGwgYmUgZGVsZXRlZCBpbiB2MTkuMC4wXG4gIHN0YXRpYyBmb3JDaGlsZCgpOiBNb2R1bGVXaXRoUHJvdmlkZXJzPE1vZGFsTW9kdWxlPiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5nTW9kdWxlOiBNb2RhbE1vZHVsZSxcbiAgICAgIHByb3ZpZGVyczogW0JzTW9kYWxTZXJ2aWNlLCBDb21wb25lbnRMb2FkZXJGYWN0b3J5LCBQb3NpdGlvbmluZ1NlcnZpY2VdXG4gICAgfTtcbiAgfVxufVxuIl19