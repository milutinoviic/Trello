import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { NgFor } from '@angular/common';
import * as i0 from "@angular/core";
export class BsCustomDatesViewComponent {
    constructor() {
        this.onSelect = new EventEmitter();
    }
    selectFromRanges(range) {
        this.onSelect.emit(range);
    }
    compareRanges(range) {
        return JSON.stringify(range?.value) === JSON.stringify(this.selectedRange);
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: BsCustomDatesViewComponent, deps: [], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "18.0.1", type: BsCustomDatesViewComponent, isStandalone: true, selector: "bs-custom-date-view", inputs: { ranges: "ranges", selectedRange: "selectedRange", customRangeLabel: "customRangeLabel" }, outputs: { onSelect: "onSelect" }, ngImport: i0, template: `
    <div class="bs-datepicker-predefined-btns">
      <button *ngFor="let range of ranges"
        type="button"
        class="btn"
        (click)="selectFromRanges(range)"
        [class.selected]="compareRanges(range)">
        {{ range.label }}
      </button>
    </div>
  `, isInline: true, dependencies: [{ kind: "directive", type: NgFor, selector: "[ngFor][ngForOf]", inputs: ["ngForOf", "ngForTrackBy", "ngForTemplate"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: BsCustomDatesViewComponent, decorators: [{
            type: Component,
            args: [{
                    selector: 'bs-custom-date-view',
                    template: `
    <div class="bs-datepicker-predefined-btns">
      <button *ngFor="let range of ranges"
        type="button"
        class="btn"
        (click)="selectFromRanges(range)"
        [class.selected]="compareRanges(range)">
        {{ range.label }}
      </button>
    </div>
  `,
                    changeDetection: ChangeDetectionStrategy.OnPush,
                    standalone: true,
                    imports: [NgFor]
                }]
        }], propDecorators: { ranges: [{
                type: Input
            }], selectedRange: [{
                type: Input
            }], customRangeLabel: [{
                type: Input
            }], onSelect: [{
                type: Output
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnMtY3VzdG9tLWRhdGVzLXZpZXcuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2RhdGVwaWNrZXIvdGhlbWVzL2JzL2JzLWN1c3RvbS1kYXRlcy12aWV3LmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFFLHVCQUF1QixFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQzs7QUF3QnhDLE1BQU0sT0FBTywwQkFBMEI7SUFqQnZDO1FBcUJZLGFBQVEsR0FBRyxJQUFJLFlBQVksRUFBaUIsQ0FBQztLQVN4RDtJQVBDLGdCQUFnQixDQUFDLEtBQXFCO1FBQ3BDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzVCLENBQUM7SUFFRCxhQUFhLENBQUMsS0FBcUI7UUFDakMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUM3RSxDQUFDOzhHQVpVLDBCQUEwQjtrR0FBMUIsMEJBQTBCLHNOQWZ6Qjs7Ozs7Ozs7OztHQVVYLDREQUdXLEtBQUs7OzJGQUVOLDBCQUEwQjtrQkFqQnRDLFNBQVM7bUJBQUM7b0JBQ1AsUUFBUSxFQUFFLHFCQUFxQjtvQkFDL0IsUUFBUSxFQUFFOzs7Ozs7Ozs7O0dBVVg7b0JBQ0MsZUFBZSxFQUFFLHVCQUF1QixDQUFDLE1BQU07b0JBQy9DLFVBQVUsRUFBRSxJQUFJO29CQUNoQixPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQUM7aUJBQ25COzhCQUVVLE1BQU07c0JBQWQsS0FBSztnQkFDRyxhQUFhO3NCQUFyQixLQUFLO2dCQUNHLGdCQUFnQjtzQkFBeEIsS0FBSztnQkFDSSxRQUFRO3NCQUFqQixNQUFNIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSwgSW5wdXQsIE91dHB1dCwgRXZlbnRFbWl0dGVyIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBOZ0ZvciB9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnNDdXN0b21EYXRlcyB7XG4gIGxhYmVsOiBzdHJpbmc7XG4gIHZhbHVlOiBEYXRlIHwgRGF0ZVtdO1xufVxuXG5AQ29tcG9uZW50KHtcbiAgICBzZWxlY3RvcjogJ2JzLWN1c3RvbS1kYXRlLXZpZXcnLFxuICAgIHRlbXBsYXRlOiBgXG4gICAgPGRpdiBjbGFzcz1cImJzLWRhdGVwaWNrZXItcHJlZGVmaW5lZC1idG5zXCI+XG4gICAgICA8YnV0dG9uICpuZ0Zvcj1cImxldCByYW5nZSBvZiByYW5nZXNcIlxuICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgY2xhc3M9XCJidG5cIlxuICAgICAgICAoY2xpY2spPVwic2VsZWN0RnJvbVJhbmdlcyhyYW5nZSlcIlxuICAgICAgICBbY2xhc3Muc2VsZWN0ZWRdPVwiY29tcGFyZVJhbmdlcyhyYW5nZSlcIj5cbiAgICAgICAge3sgcmFuZ2UubGFiZWwgfX1cbiAgICAgIDwvYnV0dG9uPlxuICAgIDwvZGl2PlxuICBgLFxuICAgIGNoYW5nZURldGVjdGlvbjogQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoLFxuICAgIHN0YW5kYWxvbmU6IHRydWUsXG4gICAgaW1wb3J0czogW05nRm9yXVxufSlcbmV4cG9ydCBjbGFzcyBCc0N1c3RvbURhdGVzVmlld0NvbXBvbmVudCB7XG4gIEBJbnB1dCgpIHJhbmdlcz86IEJzQ3VzdG9tRGF0ZXNbXTtcbiAgQElucHV0KCkgc2VsZWN0ZWRSYW5nZT86IERhdGVbXTtcbiAgQElucHV0KCkgY3VzdG9tUmFuZ2VMYWJlbD86IHN0cmluZztcbiAgQE91dHB1dCgpIG9uU2VsZWN0ID0gbmV3IEV2ZW50RW1pdHRlcjxCc0N1c3RvbURhdGVzPigpO1xuXG4gIHNlbGVjdEZyb21SYW5nZXMocmFuZ2U/OiBCc0N1c3RvbURhdGVzKSB7XG4gICAgdGhpcy5vblNlbGVjdC5lbWl0KHJhbmdlKTtcbiAgfVxuXG4gIGNvbXBhcmVSYW5nZXMocmFuZ2U/OiBCc0N1c3RvbURhdGVzKSB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHJhbmdlPy52YWx1ZSkgPT09IEpTT04uc3RyaW5naWZ5KHRoaXMuc2VsZWN0ZWRSYW5nZSk7XG4gIH1cbn1cbiJdfQ==