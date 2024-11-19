import { Component } from '@angular/core';
import { BsTimepickerViewComponent } from './bs-timepicker-view.component';
import { BsCurrentDateViewComponent } from './bs-current-date-view.component';
import { NgIf } from '@angular/common';
import * as i0 from "@angular/core";
export class BsCalendarLayoutComponent {
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: BsCalendarLayoutComponent, deps: [], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "18.0.1", type: BsCalendarLayoutComponent, isStandalone: true, selector: "bs-calendar-layout", ngImport: i0, template: `
    <!-- current date, will be added in nearest releases -->
    <bs-current-date title="hey there" *ngIf="false"></bs-current-date>

    <!--navigation-->
    <div class="bs-datepicker-head">
      <ng-content select="bs-datepicker-navigation-view"></ng-content>
    </div>

    <div class="bs-datepicker-body">
      <ng-content></ng-content>
    </div>

    <!--timepicker-->
    <bs-timepicker *ngIf="false"></bs-timepicker>
  `, isInline: true, dependencies: [{ kind: "directive", type: NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }, { kind: "component", type: BsCurrentDateViewComponent, selector: "bs-current-date", inputs: ["title"] }, { kind: "component", type: BsTimepickerViewComponent, selector: "bs-timepicker" }] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: BsCalendarLayoutComponent, decorators: [{
            type: Component,
            args: [{
                    selector: 'bs-calendar-layout',
                    template: `
    <!-- current date, will be added in nearest releases -->
    <bs-current-date title="hey there" *ngIf="false"></bs-current-date>

    <!--navigation-->
    <div class="bs-datepicker-head">
      <ng-content select="bs-datepicker-navigation-view"></ng-content>
    </div>

    <div class="bs-datepicker-body">
      <ng-content></ng-content>
    </div>

    <!--timepicker-->
    <bs-timepicker *ngIf="false"></bs-timepicker>
  `,
                    standalone: true,
                    imports: [NgIf, BsCurrentDateViewComponent, BsTimepickerViewComponent]
                }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnMtY2FsZW5kYXItbGF5b3V0LmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9kYXRlcGlja2VyL3RoZW1lcy9icy9icy1jYWxlbmRhci1sYXlvdXQuY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDMUMsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDM0UsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDOUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlCQUFpQixDQUFDOztBQXVCdkMsTUFBTSxPQUFPLHlCQUF5Qjs4R0FBekIseUJBQXlCO2tHQUF6Qix5QkFBeUIsOEVBbkJ4Qjs7Ozs7Ozs7Ozs7Ozs7O0dBZVgsNERBRVcsSUFBSSw2RkFBRSwwQkFBMEIsK0VBQUUseUJBQXlCOzsyRkFFNUQseUJBQXlCO2tCQXJCckMsU0FBUzttQkFBQztvQkFDUCxRQUFRLEVBQUUsb0JBQW9CO29CQUM5QixRQUFRLEVBQUU7Ozs7Ozs7Ozs7Ozs7OztHQWVYO29CQUNDLFVBQVUsRUFBRSxJQUFJO29CQUNoQixPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsMEJBQTBCLEVBQUUseUJBQXlCLENBQUM7aUJBQ3pFIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50IH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBCc1RpbWVwaWNrZXJWaWV3Q29tcG9uZW50IH0gZnJvbSAnLi9icy10aW1lcGlja2VyLXZpZXcuY29tcG9uZW50JztcbmltcG9ydCB7IEJzQ3VycmVudERhdGVWaWV3Q29tcG9uZW50IH0gZnJvbSAnLi9icy1jdXJyZW50LWRhdGUtdmlldy5jb21wb25lbnQnO1xuaW1wb3J0IHsgTmdJZiB9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5cbkBDb21wb25lbnQoe1xuICAgIHNlbGVjdG9yOiAnYnMtY2FsZW5kYXItbGF5b3V0JyxcbiAgICB0ZW1wbGF0ZTogYFxuICAgIDwhLS0gY3VycmVudCBkYXRlLCB3aWxsIGJlIGFkZGVkIGluIG5lYXJlc3QgcmVsZWFzZXMgLS0+XG4gICAgPGJzLWN1cnJlbnQtZGF0ZSB0aXRsZT1cImhleSB0aGVyZVwiICpuZ0lmPVwiZmFsc2VcIj48L2JzLWN1cnJlbnQtZGF0ZT5cblxuICAgIDwhLS1uYXZpZ2F0aW9uLS0+XG4gICAgPGRpdiBjbGFzcz1cImJzLWRhdGVwaWNrZXItaGVhZFwiPlxuICAgICAgPG5nLWNvbnRlbnQgc2VsZWN0PVwiYnMtZGF0ZXBpY2tlci1uYXZpZ2F0aW9uLXZpZXdcIj48L25nLWNvbnRlbnQ+XG4gICAgPC9kaXY+XG5cbiAgICA8ZGl2IGNsYXNzPVwiYnMtZGF0ZXBpY2tlci1ib2R5XCI+XG4gICAgICA8bmctY29udGVudD48L25nLWNvbnRlbnQ+XG4gICAgPC9kaXY+XG5cbiAgICA8IS0tdGltZXBpY2tlci0tPlxuICAgIDxicy10aW1lcGlja2VyICpuZ0lmPVwiZmFsc2VcIj48L2JzLXRpbWVwaWNrZXI+XG4gIGAsXG4gICAgc3RhbmRhbG9uZTogdHJ1ZSxcbiAgICBpbXBvcnRzOiBbTmdJZiwgQnNDdXJyZW50RGF0ZVZpZXdDb21wb25lbnQsIEJzVGltZXBpY2tlclZpZXdDb21wb25lbnRdXG59KVxuZXhwb3J0IGNsYXNzIEJzQ2FsZW5kYXJMYXlvdXRDb21wb25lbnQge31cbiJdfQ==