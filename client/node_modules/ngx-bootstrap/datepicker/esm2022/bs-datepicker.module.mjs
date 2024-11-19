import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { TimepickerModule } from 'ngx-bootstrap/timepicker';
import { BsDatepickerInputDirective } from './bs-datepicker-input.directive';
import { BsDatepickerDirective } from './bs-datepicker.component';
import { BsDaterangepickerInputDirective } from './bs-daterangepicker-input.directive';
import { BsDaterangepickerDirective } from './bs-daterangepicker.component';
import { BsDatepickerInlineDirective } from './bs-datepicker-inline.component';
import { BsDatepickerContainerComponent } from './themes/bs/bs-datepicker-container.component';
import { BsDaterangepickerContainerComponent } from './themes/bs/bs-daterangepicker-container.component';
import { BsDatepickerInlineContainerComponent } from './themes/bs/bs-datepicker-inline-container.component';
import { BsDaterangepickerInlineContainerComponent } from './themes/bs/bs-daterangepicker-inline-container.component';
import { BsDaterangepickerInlineDirective } from './bs-daterangepicker-inline.component';
import { BsCalendarLayoutComponent } from './themes/bs/bs-calendar-layout.component';
import { BsCurrentDateViewComponent } from './themes/bs/bs-current-date-view.component';
import { BsCustomDatesViewComponent } from './themes/bs/bs-custom-dates-view.component';
import { BsDatepickerDayDecoratorComponent } from './themes/bs/bs-datepicker-day-decorator.directive';
import { BsDatepickerNavigationViewComponent } from './themes/bs/bs-datepicker-navigation-view.component';
import { BsDaysCalendarViewComponent } from './themes/bs/bs-days-calendar-view.component';
import { BsMonthCalendarViewComponent } from './themes/bs/bs-months-calendar-view.component';
import { BsTimepickerViewComponent } from './themes/bs/bs-timepicker-view.component';
import { BsYearsCalendarViewComponent } from './themes/bs/bs-years-calendar-view.component';
import * as i0 from "@angular/core";
export class BsDatepickerModule {
    // @deprecated method not required anymore, will be deleted in v19.0.0
    static forRoot() {
        return {
            ngModule: BsDatepickerModule,
            providers: []
        };
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: BsDatepickerModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule }); }
    static { this.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "18.0.1", ngImport: i0, type: BsDatepickerModule, imports: [CommonModule, TooltipModule, TimepickerModule, BsCalendarLayoutComponent,
            BsCurrentDateViewComponent,
            BsCustomDatesViewComponent,
            BsDatepickerDayDecoratorComponent,
            BsDatepickerNavigationViewComponent,
            BsDaysCalendarViewComponent,
            BsMonthCalendarViewComponent,
            BsTimepickerViewComponent,
            BsYearsCalendarViewComponent,
            BsDatepickerContainerComponent,
            BsDatepickerDirective,
            BsDatepickerInlineContainerComponent,
            BsDatepickerInlineDirective,
            BsDatepickerInputDirective,
            BsDaterangepickerContainerComponent,
            BsDaterangepickerDirective,
            BsDaterangepickerInlineContainerComponent,
            BsDaterangepickerInlineDirective,
            BsDaterangepickerInputDirective], exports: [BsDatepickerContainerComponent,
            BsDatepickerDirective,
            BsDatepickerInlineContainerComponent,
            BsDatepickerInlineDirective,
            BsDatepickerInputDirective,
            BsDaterangepickerContainerComponent,
            BsDaterangepickerDirective,
            BsDaterangepickerInlineContainerComponent,
            BsDaterangepickerInlineDirective,
            BsDaterangepickerInputDirective] }); }
    static { this.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: BsDatepickerModule, imports: [CommonModule, TooltipModule, TimepickerModule,
            BsDaysCalendarViewComponent,
            BsDatepickerContainerComponent,
            BsDatepickerInlineContainerComponent,
            BsDaterangepickerContainerComponent,
            BsDaterangepickerInlineContainerComponent] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: BsDatepickerModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: [CommonModule, TooltipModule, TimepickerModule, BsCalendarLayoutComponent,
                        BsCurrentDateViewComponent,
                        BsCustomDatesViewComponent,
                        BsDatepickerDayDecoratorComponent,
                        BsDatepickerNavigationViewComponent,
                        BsDaysCalendarViewComponent,
                        BsMonthCalendarViewComponent,
                        BsTimepickerViewComponent,
                        BsYearsCalendarViewComponent,
                        BsDatepickerContainerComponent,
                        BsDatepickerDirective,
                        BsDatepickerInlineContainerComponent,
                        BsDatepickerInlineDirective,
                        BsDatepickerInputDirective,
                        BsDaterangepickerContainerComponent,
                        BsDaterangepickerDirective,
                        BsDaterangepickerInlineContainerComponent,
                        BsDaterangepickerInlineDirective,
                        BsDaterangepickerInputDirective],
                    exports: [
                        BsDatepickerContainerComponent,
                        BsDatepickerDirective,
                        BsDatepickerInlineContainerComponent,
                        BsDatepickerInlineDirective,
                        BsDatepickerInputDirective,
                        BsDaterangepickerContainerComponent,
                        BsDaterangepickerDirective,
                        BsDaterangepickerInlineContainerComponent,
                        BsDaterangepickerInlineDirective,
                        BsDaterangepickerInputDirective
                    ]
                }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnMtZGF0ZXBpY2tlci5tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvZGF0ZXBpY2tlci9icy1kYXRlcGlja2VyLm1vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDL0MsT0FBTyxFQUF1QixRQUFRLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFFOUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3RELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRTVELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2xFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRTVFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRS9FLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQy9GLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRXpHLE9BQU8sRUFBRSxvQ0FBb0MsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzVHLE9BQU8sRUFBRSx5Q0FBeUMsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBRXRILE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRXpGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzFHLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzFGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDOztBQW1DNUYsTUFBTSxPQUFPLGtCQUFrQjtJQUM3QixzRUFBc0U7SUFDdEUsTUFBTSxDQUFDLE9BQU87UUFDWixPQUFPO1lBQ0wsUUFBUSxFQUFFLGtCQUFrQjtZQUM1QixTQUFTLEVBQUUsRUFBRTtTQUNkLENBQUM7SUFDSixDQUFDOzhHQVBVLGtCQUFrQjsrR0FBbEIsa0JBQWtCLFlBaENqQixZQUFZLEVBQUUsYUFBYSxFQUFFLGdCQUFnQixFQUFFLHlCQUF5QjtZQUM5RSwwQkFBMEI7WUFDMUIsMEJBQTBCO1lBQzFCLGlDQUFpQztZQUNqQyxtQ0FBbUM7WUFDbkMsMkJBQTJCO1lBQzNCLDRCQUE0QjtZQUM1Qix5QkFBeUI7WUFDekIsNEJBQTRCO1lBQzVCLDhCQUE4QjtZQUM5QixxQkFBcUI7WUFDckIsb0NBQW9DO1lBQ3BDLDJCQUEyQjtZQUMzQiwwQkFBMEI7WUFDMUIsbUNBQW1DO1lBQ25DLDBCQUEwQjtZQUMxQix5Q0FBeUM7WUFDekMsZ0NBQWdDO1lBQ2hDLCtCQUErQixhQUUvQiw4QkFBOEI7WUFDOUIscUJBQXFCO1lBQ3JCLG9DQUFvQztZQUNwQywyQkFBMkI7WUFDM0IsMEJBQTBCO1lBQzFCLG1DQUFtQztZQUNuQywwQkFBMEI7WUFDMUIseUNBQXlDO1lBQ3pDLGdDQUFnQztZQUNoQywrQkFBK0I7K0dBRzFCLGtCQUFrQixZQWhDakIsWUFBWSxFQUFFLGFBQWEsRUFBRSxnQkFBZ0I7WUFLbkQsMkJBQTJCO1lBSTNCLDhCQUE4QjtZQUU5QixvQ0FBb0M7WUFHcEMsbUNBQW1DO1lBRW5DLHlDQUF5Qzs7MkZBZ0JwQyxrQkFBa0I7a0JBakM5QixRQUFRO21CQUFDO29CQUNOLE9BQU8sRUFBRSxDQUFDLFlBQVksRUFBRSxhQUFhLEVBQUUsZ0JBQWdCLEVBQUUseUJBQXlCO3dCQUM5RSwwQkFBMEI7d0JBQzFCLDBCQUEwQjt3QkFDMUIsaUNBQWlDO3dCQUNqQyxtQ0FBbUM7d0JBQ25DLDJCQUEyQjt3QkFDM0IsNEJBQTRCO3dCQUM1Qix5QkFBeUI7d0JBQ3pCLDRCQUE0Qjt3QkFDNUIsOEJBQThCO3dCQUM5QixxQkFBcUI7d0JBQ3JCLG9DQUFvQzt3QkFDcEMsMkJBQTJCO3dCQUMzQiwwQkFBMEI7d0JBQzFCLG1DQUFtQzt3QkFDbkMsMEJBQTBCO3dCQUMxQix5Q0FBeUM7d0JBQ3pDLGdDQUFnQzt3QkFDaEMsK0JBQStCLENBQUM7b0JBQ3BDLE9BQU8sRUFBRTt3QkFDTCw4QkFBOEI7d0JBQzlCLHFCQUFxQjt3QkFDckIsb0NBQW9DO3dCQUNwQywyQkFBMkI7d0JBQzNCLDBCQUEwQjt3QkFDMUIsbUNBQW1DO3dCQUNuQywwQkFBMEI7d0JBQzFCLHlDQUF5Qzt3QkFDekMsZ0NBQWdDO3dCQUNoQywrQkFBK0I7cUJBQ2xDO2lCQUNKIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tbW9uTW9kdWxlIH0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcbmltcG9ydCB7IE1vZHVsZVdpdGhQcm92aWRlcnMsIE5nTW9kdWxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmltcG9ydCB7IFRvb2x0aXBNb2R1bGUgfSBmcm9tICduZ3gtYm9vdHN0cmFwL3Rvb2x0aXAnO1xuaW1wb3J0IHsgVGltZXBpY2tlck1vZHVsZSB9IGZyb20gJ25neC1ib290c3RyYXAvdGltZXBpY2tlcic7XG5cbmltcG9ydCB7IEJzRGF0ZXBpY2tlcklucHV0RGlyZWN0aXZlIH0gZnJvbSAnLi9icy1kYXRlcGlja2VyLWlucHV0LmRpcmVjdGl2ZSc7XG5pbXBvcnQgeyBCc0RhdGVwaWNrZXJEaXJlY3RpdmUgfSBmcm9tICcuL2JzLWRhdGVwaWNrZXIuY29tcG9uZW50JztcbmltcG9ydCB7IEJzRGF0ZXJhbmdlcGlja2VySW5wdXREaXJlY3RpdmUgfSBmcm9tICcuL2JzLWRhdGVyYW5nZXBpY2tlci1pbnB1dC5kaXJlY3RpdmUnO1xuaW1wb3J0IHsgQnNEYXRlcmFuZ2VwaWNrZXJEaXJlY3RpdmUgfSBmcm9tICcuL2JzLWRhdGVyYW5nZXBpY2tlci5jb21wb25lbnQnO1xuXG5pbXBvcnQgeyBCc0RhdGVwaWNrZXJJbmxpbmVEaXJlY3RpdmUgfSBmcm9tICcuL2JzLWRhdGVwaWNrZXItaW5saW5lLmNvbXBvbmVudCc7XG5cbmltcG9ydCB7IEJzRGF0ZXBpY2tlckNvbnRhaW5lckNvbXBvbmVudCB9IGZyb20gJy4vdGhlbWVzL2JzL2JzLWRhdGVwaWNrZXItY29udGFpbmVyLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBCc0RhdGVyYW5nZXBpY2tlckNvbnRhaW5lckNvbXBvbmVudCB9IGZyb20gJy4vdGhlbWVzL2JzL2JzLWRhdGVyYW5nZXBpY2tlci1jb250YWluZXIuY29tcG9uZW50JztcblxuaW1wb3J0IHsgQnNEYXRlcGlja2VySW5saW5lQ29udGFpbmVyQ29tcG9uZW50IH0gZnJvbSAnLi90aGVtZXMvYnMvYnMtZGF0ZXBpY2tlci1pbmxpbmUtY29udGFpbmVyLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBCc0RhdGVyYW5nZXBpY2tlcklubGluZUNvbnRhaW5lckNvbXBvbmVudCB9IGZyb20gJy4vdGhlbWVzL2JzL2JzLWRhdGVyYW5nZXBpY2tlci1pbmxpbmUtY29udGFpbmVyLmNvbXBvbmVudCc7XG5cbmltcG9ydCB7IEJzRGF0ZXJhbmdlcGlja2VySW5saW5lRGlyZWN0aXZlIH0gZnJvbSAnLi9icy1kYXRlcmFuZ2VwaWNrZXItaW5saW5lLmNvbXBvbmVudCc7XG5cbmltcG9ydCB7IEJzQ2FsZW5kYXJMYXlvdXRDb21wb25lbnQgfSBmcm9tICcuL3RoZW1lcy9icy9icy1jYWxlbmRhci1sYXlvdXQuY29tcG9uZW50JztcbmltcG9ydCB7IEJzQ3VycmVudERhdGVWaWV3Q29tcG9uZW50IH0gZnJvbSAnLi90aGVtZXMvYnMvYnMtY3VycmVudC1kYXRlLXZpZXcuY29tcG9uZW50JztcbmltcG9ydCB7IEJzQ3VzdG9tRGF0ZXNWaWV3Q29tcG9uZW50IH0gZnJvbSAnLi90aGVtZXMvYnMvYnMtY3VzdG9tLWRhdGVzLXZpZXcuY29tcG9uZW50JztcbmltcG9ydCB7IEJzRGF0ZXBpY2tlckRheURlY29yYXRvckNvbXBvbmVudCB9IGZyb20gJy4vdGhlbWVzL2JzL2JzLWRhdGVwaWNrZXItZGF5LWRlY29yYXRvci5kaXJlY3RpdmUnO1xuaW1wb3J0IHsgQnNEYXRlcGlja2VyTmF2aWdhdGlvblZpZXdDb21wb25lbnQgfSBmcm9tICcuL3RoZW1lcy9icy9icy1kYXRlcGlja2VyLW5hdmlnYXRpb24tdmlldy5jb21wb25lbnQnO1xuaW1wb3J0IHsgQnNEYXlzQ2FsZW5kYXJWaWV3Q29tcG9uZW50IH0gZnJvbSAnLi90aGVtZXMvYnMvYnMtZGF5cy1jYWxlbmRhci12aWV3LmNvbXBvbmVudCc7XG5pbXBvcnQgeyBCc01vbnRoQ2FsZW5kYXJWaWV3Q29tcG9uZW50IH0gZnJvbSAnLi90aGVtZXMvYnMvYnMtbW9udGhzLWNhbGVuZGFyLXZpZXcuY29tcG9uZW50JztcbmltcG9ydCB7IEJzVGltZXBpY2tlclZpZXdDb21wb25lbnQgfSBmcm9tICcuL3RoZW1lcy9icy9icy10aW1lcGlja2VyLXZpZXcuY29tcG9uZW50JztcbmltcG9ydCB7IEJzWWVhcnNDYWxlbmRhclZpZXdDb21wb25lbnQgfSBmcm9tICcuL3RoZW1lcy9icy9icy15ZWFycy1jYWxlbmRhci12aWV3LmNvbXBvbmVudCc7XG5cbkBOZ01vZHVsZSh7XG4gICAgaW1wb3J0czogW0NvbW1vbk1vZHVsZSwgVG9vbHRpcE1vZHVsZSwgVGltZXBpY2tlck1vZHVsZSwgQnNDYWxlbmRhckxheW91dENvbXBvbmVudCxcbiAgICAgICAgQnNDdXJyZW50RGF0ZVZpZXdDb21wb25lbnQsXG4gICAgICAgIEJzQ3VzdG9tRGF0ZXNWaWV3Q29tcG9uZW50LFxuICAgICAgICBCc0RhdGVwaWNrZXJEYXlEZWNvcmF0b3JDb21wb25lbnQsXG4gICAgICAgIEJzRGF0ZXBpY2tlck5hdmlnYXRpb25WaWV3Q29tcG9uZW50LFxuICAgICAgICBCc0RheXNDYWxlbmRhclZpZXdDb21wb25lbnQsXG4gICAgICAgIEJzTW9udGhDYWxlbmRhclZpZXdDb21wb25lbnQsXG4gICAgICAgIEJzVGltZXBpY2tlclZpZXdDb21wb25lbnQsXG4gICAgICAgIEJzWWVhcnNDYWxlbmRhclZpZXdDb21wb25lbnQsXG4gICAgICAgIEJzRGF0ZXBpY2tlckNvbnRhaW5lckNvbXBvbmVudCxcbiAgICAgICAgQnNEYXRlcGlja2VyRGlyZWN0aXZlLFxuICAgICAgICBCc0RhdGVwaWNrZXJJbmxpbmVDb250YWluZXJDb21wb25lbnQsXG4gICAgICAgIEJzRGF0ZXBpY2tlcklubGluZURpcmVjdGl2ZSxcbiAgICAgICAgQnNEYXRlcGlja2VySW5wdXREaXJlY3RpdmUsXG4gICAgICAgIEJzRGF0ZXJhbmdlcGlja2VyQ29udGFpbmVyQ29tcG9uZW50LFxuICAgICAgICBCc0RhdGVyYW5nZXBpY2tlckRpcmVjdGl2ZSxcbiAgICAgICAgQnNEYXRlcmFuZ2VwaWNrZXJJbmxpbmVDb250YWluZXJDb21wb25lbnQsXG4gICAgICAgIEJzRGF0ZXJhbmdlcGlja2VySW5saW5lRGlyZWN0aXZlLFxuICAgICAgICBCc0RhdGVyYW5nZXBpY2tlcklucHV0RGlyZWN0aXZlXSxcbiAgICBleHBvcnRzOiBbXG4gICAgICAgIEJzRGF0ZXBpY2tlckNvbnRhaW5lckNvbXBvbmVudCxcbiAgICAgICAgQnNEYXRlcGlja2VyRGlyZWN0aXZlLFxuICAgICAgICBCc0RhdGVwaWNrZXJJbmxpbmVDb250YWluZXJDb21wb25lbnQsXG4gICAgICAgIEJzRGF0ZXBpY2tlcklubGluZURpcmVjdGl2ZSxcbiAgICAgICAgQnNEYXRlcGlja2VySW5wdXREaXJlY3RpdmUsXG4gICAgICAgIEJzRGF0ZXJhbmdlcGlja2VyQ29udGFpbmVyQ29tcG9uZW50LFxuICAgICAgICBCc0RhdGVyYW5nZXBpY2tlckRpcmVjdGl2ZSxcbiAgICAgICAgQnNEYXRlcmFuZ2VwaWNrZXJJbmxpbmVDb250YWluZXJDb21wb25lbnQsXG4gICAgICAgIEJzRGF0ZXJhbmdlcGlja2VySW5saW5lRGlyZWN0aXZlLFxuICAgICAgICBCc0RhdGVyYW5nZXBpY2tlcklucHV0RGlyZWN0aXZlXG4gICAgXVxufSlcbmV4cG9ydCBjbGFzcyBCc0RhdGVwaWNrZXJNb2R1bGUge1xuICAvLyBAZGVwcmVjYXRlZCBtZXRob2Qgbm90IHJlcXVpcmVkIGFueW1vcmUsIHdpbGwgYmUgZGVsZXRlZCBpbiB2MTkuMC4wXG4gIHN0YXRpYyBmb3JSb290KCk6IE1vZHVsZVdpdGhQcm92aWRlcnM8QnNEYXRlcGlja2VyTW9kdWxlPiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5nTW9kdWxlOiBCc0RhdGVwaWNrZXJNb2R1bGUsXG4gICAgICBwcm92aWRlcnM6IFtdXG4gICAgfTtcbiAgfVxufVxuIl19