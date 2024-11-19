import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ProgressbarConfig } from './progressbar.config';
import { BarComponent } from './bar.component';
import { NgIf, NgFor } from '@angular/common';
import * as i0 from "@angular/core";
import * as i1 from "./progressbar.config";
export class ProgressbarComponent {
    /** current value of progress bar. Could be a number or array of objects
     * like {"value":15,"type":"info","label":"15 %"}
     */
    set value(value) {
        this.isStacked = Array.isArray(value);
        if (typeof value === 'number') {
            this._value = value;
            this._values = void 0;
        }
        else {
            this._value = void 0;
            this._values = value;
        }
    }
    constructor(config) {
        /** maximum total value of progress element */
        this.max = 100;
        /** if `true` changing value of progress bar will be animated */
        this.animate = false;
        /** If `true`, striped classes are applied */
        this.striped = false;
        this.isStacked = false;
        this._value = 0;
        Object.assign(this, config);
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: ProgressbarComponent, deps: [{ token: i1.ProgressbarConfig }], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "18.0.1", type: ProgressbarComponent, isStandalone: true, selector: "progressbar", inputs: { max: "max", animate: "animate", striped: "striped", type: "type", value: "value" }, host: { properties: { "class.progress": "true", "attr.max": "max" } }, ngImport: i0, template: "<ng-container *ngIf=\"!isStacked then NotStacked else Stacked\"></ng-container>\n\n<ng-template #NotStacked>\n  <bar [type]=\"type\" [value]=\"_value\" [max]=\"max\" [animate]=\"animate\" [striped]=\"striped\">\n    <ng-content></ng-content>\n  </bar>\n</ng-template>\n\n<ng-template #Stacked>\n  <bar *ngFor=\"let item of _values\"\n       [type]=\"item.type\" [value]=\"item.value\" [max]=\"item.max || max\" [animate]=\"animate\" [striped]=\"striped\">{{ item.label }}</bar>\n</ng-template>\n", styles: [":host{width:100%;display:flex}\n"], dependencies: [{ kind: "directive", type: NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }, { kind: "component", type: BarComponent, selector: "bar", inputs: ["max", "value", "animate", "striped", "type"] }, { kind: "directive", type: NgFor, selector: "[ngFor][ngForOf]", inputs: ["ngForOf", "ngForTrackBy", "ngForTemplate"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: ProgressbarComponent, decorators: [{
            type: Component,
            args: [{ selector: 'progressbar', changeDetection: ChangeDetectionStrategy.OnPush, host: {
                        '[class.progress]': 'true',
                        '[attr.max]': 'max'
                    }, standalone: true, imports: [NgIf, BarComponent, NgFor], template: "<ng-container *ngIf=\"!isStacked then NotStacked else Stacked\"></ng-container>\n\n<ng-template #NotStacked>\n  <bar [type]=\"type\" [value]=\"_value\" [max]=\"max\" [animate]=\"animate\" [striped]=\"striped\">\n    <ng-content></ng-content>\n  </bar>\n</ng-template>\n\n<ng-template #Stacked>\n  <bar *ngFor=\"let item of _values\"\n       [type]=\"item.type\" [value]=\"item.value\" [max]=\"item.max || max\" [animate]=\"animate\" [striped]=\"striped\">{{ item.label }}</bar>\n</ng-template>\n", styles: [":host{width:100%;display:flex}\n"] }]
        }], ctorParameters: () => [{ type: i1.ProgressbarConfig }], propDecorators: { max: [{
                type: Input
            }], animate: [{
                type: Input
            }], striped: [{
                type: Input
            }], type: [{
                type: Input
            }], value: [{
                type: Input
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3NiYXIuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3Byb2dyZXNzYmFyL3Byb2dyZXNzYmFyLmNvbXBvbmVudC50cyIsIi4uLy4uLy4uLy4uL3NyYy9wcm9ncmVzc2Jhci9wcm9ncmVzc2Jhci5jb21wb25lbnQuaHRtbCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUUxRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDL0MsT0FBTyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQzs7O0FBbUI5QyxNQUFNLE9BQU8sb0JBQW9CO0lBYS9COztPQUVHO0lBQ0gsSUFDSSxLQUFLLENBQUMsS0FBMEI7UUFDbEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3RDLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDOUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7WUFDcEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsQ0FBQztRQUN4QixDQUFDO2FBQU0sQ0FBQztZQUNOLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLENBQUM7WUFDckIsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7UUFDdkIsQ0FBQztJQUNILENBQUM7SUFNRCxZQUFZLE1BQXlCO1FBL0JyQyw4Q0FBOEM7UUFDckMsUUFBRyxHQUFHLEdBQUcsQ0FBQztRQUVuQixnRUFBZ0U7UUFDdkQsWUFBTyxHQUFHLEtBQUssQ0FBQztRQUV6Qiw2Q0FBNkM7UUFDcEMsWUFBTyxHQUFHLEtBQUssQ0FBQztRQW9CekIsY0FBUyxHQUFHLEtBQUssQ0FBQztRQUNsQixXQUFNLEdBQUksQ0FBQyxDQUFDO1FBSVYsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDOUIsQ0FBQzs4R0FsQ1Usb0JBQW9CO2tHQUFwQixvQkFBb0IsNE9DdkJqQyxpZkFZQSwwRkRTYyxJQUFJLDZGQUFFLFlBQVksd0dBQUUsS0FBSzs7MkZBRTFCLG9CQUFvQjtrQkFqQmhDLFNBQVM7K0JBQ0ksYUFBYSxtQkFFTix1QkFBdUIsQ0FBQyxNQUFNLFFBRXpDO3dCQUNGLGtCQUFrQixFQUFFLE1BQU07d0JBQzFCLFlBQVksRUFBRSxLQUFLO3FCQUN0QixjQU1XLElBQUksV0FDUCxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsS0FBSyxDQUFDO3NGQUk3QixHQUFHO3NCQUFYLEtBQUs7Z0JBR0csT0FBTztzQkFBZixLQUFLO2dCQUdHLE9BQU87c0JBQWYsS0FBSztnQkFHRyxJQUFJO3NCQUFaLEtBQUs7Z0JBTUYsS0FBSztzQkFEUixLQUFLIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksIENvbXBvbmVudCwgSW5wdXQgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IEJhclZhbHVlLCBQcm9ncmVzc2JhclR5cGUgfSBmcm9tICcuL3Byb2dyZXNzYmFyLXR5cGUuaW50ZXJmYWNlJztcbmltcG9ydCB7IFByb2dyZXNzYmFyQ29uZmlnIH0gZnJvbSAnLi9wcm9ncmVzc2Jhci5jb25maWcnO1xuaW1wb3J0IHsgQmFyQ29tcG9uZW50IH0gZnJvbSAnLi9iYXIuY29tcG9uZW50JztcbmltcG9ydCB7IE5nSWYsIE5nRm9yIH0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcblxuQENvbXBvbmVudCh7XG4gICAgc2VsZWN0b3I6ICdwcm9ncmVzc2JhcicsXG4gICAgdGVtcGxhdGVVcmw6ICcuL3Byb2dyZXNzYmFyLmNvbXBvbmVudC5odG1sJyxcbiAgICBjaGFuZ2VEZXRlY3Rpb246IENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaCxcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQGFuZ3VsYXItZXNsaW50L25vLWhvc3QtbWV0YWRhdGEtcHJvcGVydHlcbiAgICBob3N0OiB7XG4gICAgICAgICdbY2xhc3MucHJvZ3Jlc3NdJzogJ3RydWUnLFxuICAgICAgICAnW2F0dHIubWF4XSc6ICdtYXgnXG4gICAgfSxcbiAgICBzdHlsZXM6IFtgXG4gICAgOmhvc3Qge1xuICAgICAgd2lkdGg6IDEwMCU7XG4gICAgICBkaXNwbGF5OiBmbGV4O1xuICAgIH0gYF0sXG4gICAgc3RhbmRhbG9uZTogdHJ1ZSxcbiAgICBpbXBvcnRzOiBbTmdJZiwgQmFyQ29tcG9uZW50LCBOZ0Zvcl1cbn0pXG5leHBvcnQgY2xhc3MgUHJvZ3Jlc3NiYXJDb21wb25lbnQge1xuICAvKiogbWF4aW11bSB0b3RhbCB2YWx1ZSBvZiBwcm9ncmVzcyBlbGVtZW50ICovXG4gIEBJbnB1dCgpIG1heCA9IDEwMDtcblxuICAvKiogaWYgYHRydWVgIGNoYW5naW5nIHZhbHVlIG9mIHByb2dyZXNzIGJhciB3aWxsIGJlIGFuaW1hdGVkICovXG4gIEBJbnB1dCgpIGFuaW1hdGUgPSBmYWxzZTtcblxuICAvKiogSWYgYHRydWVgLCBzdHJpcGVkIGNsYXNzZXMgYXJlIGFwcGxpZWQgKi9cbiAgQElucHV0KCkgc3RyaXBlZCA9IGZhbHNlO1xuXG4gIC8qKiBwcm92aWRlIG9uZSBvZiB0aGUgZm91ciBzdXBwb3J0ZWQgY29udGV4dHVhbCBjbGFzc2VzOiBgc3VjY2Vzc2AsIGBpbmZvYCwgYHdhcm5pbmdgLCBgZGFuZ2VyYCAqL1xuICBASW5wdXQoKSB0eXBlPzogUHJvZ3Jlc3NiYXJUeXBlO1xuXG4gIC8qKiBjdXJyZW50IHZhbHVlIG9mIHByb2dyZXNzIGJhci4gQ291bGQgYmUgYSBudW1iZXIgb3IgYXJyYXkgb2Ygb2JqZWN0c1xuICAgKiBsaWtlIHtcInZhbHVlXCI6MTUsXCJ0eXBlXCI6XCJpbmZvXCIsXCJsYWJlbFwiOlwiMTUgJVwifVxuICAgKi9cbiAgQElucHV0KClcbiAgc2V0IHZhbHVlKHZhbHVlOiBudW1iZXIgfCBCYXJWYWx1ZVtdKSB7XG4gICAgdGhpcy5pc1N0YWNrZWQgPSBBcnJheS5pc0FycmF5KHZhbHVlKTtcbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgICAgdGhpcy5fdmFsdWUgPSB2YWx1ZTtcbiAgICAgIHRoaXMuX3ZhbHVlcyA9IHZvaWQgMDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fdmFsdWUgPSB2b2lkIDA7XG4gICAgICB0aGlzLl92YWx1ZXMgPSB2YWx1ZTtcbiAgICB9XG4gIH1cblxuICBpc1N0YWNrZWQgPSBmYWxzZTtcbiAgX3ZhbHVlPyA9IDA7XG4gIF92YWx1ZXM/OiBCYXJWYWx1ZVtdO1xuXG4gIGNvbnN0cnVjdG9yKGNvbmZpZzogUHJvZ3Jlc3NiYXJDb25maWcpIHtcbiAgICBPYmplY3QuYXNzaWduKHRoaXMsIGNvbmZpZyk7XG4gIH1cbn1cbiIsIjxuZy1jb250YWluZXIgKm5nSWY9XCIhaXNTdGFja2VkIHRoZW4gTm90U3RhY2tlZCBlbHNlIFN0YWNrZWRcIj48L25nLWNvbnRhaW5lcj5cblxuPG5nLXRlbXBsYXRlICNOb3RTdGFja2VkPlxuICA8YmFyIFt0eXBlXT1cInR5cGVcIiBbdmFsdWVdPVwiX3ZhbHVlXCIgW21heF09XCJtYXhcIiBbYW5pbWF0ZV09XCJhbmltYXRlXCIgW3N0cmlwZWRdPVwic3RyaXBlZFwiPlxuICAgIDxuZy1jb250ZW50PjwvbmctY29udGVudD5cbiAgPC9iYXI+XG48L25nLXRlbXBsYXRlPlxuXG48bmctdGVtcGxhdGUgI1N0YWNrZWQ+XG4gIDxiYXIgKm5nRm9yPVwibGV0IGl0ZW0gb2YgX3ZhbHVlc1wiXG4gICAgICAgW3R5cGVdPVwiaXRlbS50eXBlXCIgW3ZhbHVlXT1cIml0ZW0udmFsdWVcIiBbbWF4XT1cIml0ZW0ubWF4IHx8IG1heFwiIFthbmltYXRlXT1cImFuaW1hdGVcIiBbc3RyaXBlZF09XCJzdHJpcGVkXCI+e3sgaXRlbS5sYWJlbCB9fTwvYmFyPlxuPC9uZy10ZW1wbGF0ZT5cbiJdfQ==