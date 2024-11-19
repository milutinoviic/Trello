import { ChangeDetectionStrategy, Component, ElementRef, Input, Renderer2 } from '@angular/core';
import { BsDatepickerConfig } from '../../bs-datepicker.config';
import * as i0 from "@angular/core";
import * as i1 from "../../bs-datepicker.config";
export class BsDatepickerDayDecoratorComponent {
    constructor(_config, _elRef, _renderer) {
        this._config = _config;
        this._elRef = _elRef;
        this._renderer = _renderer;
        this.day = { date: new Date(), label: '' };
    }
    ngOnInit() {
        if (this.day?.isToday && this._config && this._config.customTodayClass) {
            this._renderer.addClass(this._elRef.nativeElement, this._config.customTodayClass);
        }
        if (typeof this.day?.customClasses === 'string') {
            this.day?.customClasses.split(' ')
                .filter((className) => className)
                .forEach((className) => {
                this._renderer.addClass(this._elRef.nativeElement, className);
            });
        }
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: BsDatepickerDayDecoratorComponent, deps: [{ token: i1.BsDatepickerConfig }, { token: i0.ElementRef }, { token: i0.Renderer2 }], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "18.0.1", type: BsDatepickerDayDecoratorComponent, isStandalone: true, selector: "[bsDatepickerDayDecorator]", inputs: { day: "day" }, host: { properties: { "class.disabled": "day.isDisabled", "class.is-highlighted": "day.isHovered", "class.is-other-month": "day.isOtherMonth", "class.is-active-other-month": "day.isOtherMonthHovered", "class.in-range": "day.isInRange", "class.select-start": "day.isSelectionStart", "class.select-end": "day.isSelectionEnd", "class.selected": "day.isSelected" } }, ngImport: i0, template: `{{ day && day.label || '' }}`, isInline: true, changeDetection: i0.ChangeDetectionStrategy.OnPush }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: BsDatepickerDayDecoratorComponent, decorators: [{
            type: Component,
            args: [{
                    selector: '[bsDatepickerDayDecorator]',
                    changeDetection: ChangeDetectionStrategy.OnPush,
                    host: {
                        '[class.disabled]': 'day.isDisabled',
                        '[class.is-highlighted]': 'day.isHovered',
                        '[class.is-other-month]': 'day.isOtherMonth',
                        '[class.is-active-other-month]': 'day.isOtherMonthHovered',
                        '[class.in-range]': 'day.isInRange',
                        '[class.select-start]': 'day.isSelectionStart',
                        '[class.select-end]': 'day.isSelectionEnd',
                        '[class.selected]': 'day.isSelected'
                    },
                    template: `{{ day && day.label || '' }}`,
                    standalone: true
                }]
        }], ctorParameters: () => [{ type: i1.BsDatepickerConfig }, { type: i0.ElementRef }, { type: i0.Renderer2 }], propDecorators: { day: [{
                type: Input
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnMtZGF0ZXBpY2tlci1kYXktZGVjb3JhdG9yLmRpcmVjdGl2ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9kYXRlcGlja2VyL3RoZW1lcy9icy9icy1kYXRlcGlja2VyLWRheS1kZWNvcmF0b3IuZGlyZWN0aXZlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFDTCx1QkFBdUIsRUFDdkIsU0FBUyxFQUNULFVBQVUsRUFDVixLQUFLLEVBRUwsU0FBUyxFQUNWLE1BQU0sZUFBZSxDQUFDO0FBRXZCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDOzs7QUFtQmhFLE1BQU0sT0FBTyxpQ0FBaUM7SUFHNUMsWUFDVSxPQUEyQixFQUMzQixNQUFrQixFQUNsQixTQUFvQjtRQUZwQixZQUFPLEdBQVAsT0FBTyxDQUFvQjtRQUMzQixXQUFNLEdBQU4sTUFBTSxDQUFZO1FBQ2xCLGNBQVMsR0FBVCxTQUFTLENBQVc7UUFMckIsUUFBRyxHQUFpQixFQUFFLElBQUksRUFBRSxJQUFJLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQztJQU16RCxDQUFDO0lBRUwsUUFBUTtRQUVOLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDdkUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3BGLENBQUM7UUFFRCxJQUFJLE9BQU8sSUFBSSxDQUFDLEdBQUcsRUFBRSxhQUFhLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDaEQsSUFBSSxDQUFDLEdBQUcsRUFBRSxhQUFhLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztpQkFDL0IsTUFBTSxDQUFDLENBQUMsU0FBaUIsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDO2lCQUN4QyxPQUFPLENBQUMsQ0FBQyxTQUFpQixFQUFFLEVBQUU7Z0JBQzdCLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ2hFLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQztJQUNILENBQUM7OEdBdEJVLGlDQUFpQztrR0FBakMsaUNBQWlDLDBkQUhoQyw4QkFBOEI7OzJGQUcvQixpQ0FBaUM7a0JBaEI3QyxTQUFTO21CQUFDO29CQUNQLFFBQVEsRUFBRSw0QkFBNEI7b0JBQ3RDLGVBQWUsRUFBRSx1QkFBdUIsQ0FBQyxNQUFNO29CQUMvQyxJQUFJLEVBQUU7d0JBQ0Ysa0JBQWtCLEVBQUUsZ0JBQWdCO3dCQUNwQyx3QkFBd0IsRUFBRSxlQUFlO3dCQUN6Qyx3QkFBd0IsRUFBRSxrQkFBa0I7d0JBQzVDLCtCQUErQixFQUFFLHlCQUF5Qjt3QkFDMUQsa0JBQWtCLEVBQUUsZUFBZTt3QkFDbkMsc0JBQXNCLEVBQUUsc0JBQXNCO3dCQUM5QyxvQkFBb0IsRUFBRSxvQkFBb0I7d0JBQzFDLGtCQUFrQixFQUFFLGdCQUFnQjtxQkFDdkM7b0JBQ0QsUUFBUSxFQUFFLDhCQUE4QjtvQkFDeEMsVUFBVSxFQUFFLElBQUk7aUJBQ25CO3dJQUVVLEdBQUc7c0JBQVgsS0FBSyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIENoYW5nZURldGVjdGlvblN0cmF0ZWd5LFxuICBDb21wb25lbnQsXG4gIEVsZW1lbnRSZWYsXG4gIElucHV0LFxuICBPbkluaXQsXG4gIFJlbmRlcmVyMlxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuaW1wb3J0IHsgQnNEYXRlcGlja2VyQ29uZmlnIH0gZnJvbSAnLi4vLi4vYnMtZGF0ZXBpY2tlci5jb25maWcnO1xuaW1wb3J0IHsgRGF5Vmlld01vZGVsIH0gZnJvbSAnLi4vLi4vbW9kZWxzJztcblxuQENvbXBvbmVudCh7XG4gICAgc2VsZWN0b3I6ICdbYnNEYXRlcGlja2VyRGF5RGVjb3JhdG9yXScsXG4gICAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXG4gICAgaG9zdDoge1xuICAgICAgICAnW2NsYXNzLmRpc2FibGVkXSc6ICdkYXkuaXNEaXNhYmxlZCcsXG4gICAgICAgICdbY2xhc3MuaXMtaGlnaGxpZ2h0ZWRdJzogJ2RheS5pc0hvdmVyZWQnLFxuICAgICAgICAnW2NsYXNzLmlzLW90aGVyLW1vbnRoXSc6ICdkYXkuaXNPdGhlck1vbnRoJyxcbiAgICAgICAgJ1tjbGFzcy5pcy1hY3RpdmUtb3RoZXItbW9udGhdJzogJ2RheS5pc090aGVyTW9udGhIb3ZlcmVkJyxcbiAgICAgICAgJ1tjbGFzcy5pbi1yYW5nZV0nOiAnZGF5LmlzSW5SYW5nZScsXG4gICAgICAgICdbY2xhc3Muc2VsZWN0LXN0YXJ0XSc6ICdkYXkuaXNTZWxlY3Rpb25TdGFydCcsXG4gICAgICAgICdbY2xhc3Muc2VsZWN0LWVuZF0nOiAnZGF5LmlzU2VsZWN0aW9uRW5kJyxcbiAgICAgICAgJ1tjbGFzcy5zZWxlY3RlZF0nOiAnZGF5LmlzU2VsZWN0ZWQnXG4gICAgfSxcbiAgICB0ZW1wbGF0ZTogYHt7IGRheSAmJiBkYXkubGFiZWwgfHwgJycgfX1gLFxuICAgIHN0YW5kYWxvbmU6IHRydWVcbn0pXG5leHBvcnQgY2xhc3MgQnNEYXRlcGlja2VyRGF5RGVjb3JhdG9yQ29tcG9uZW50IGltcGxlbWVudHMgT25Jbml0IHtcbiAgQElucHV0KCkgZGF5OiBEYXlWaWV3TW9kZWwgPSB7IGRhdGU6IG5ldyBEYXRlKCksIGxhYmVsOiAnJyB9O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgX2NvbmZpZzogQnNEYXRlcGlja2VyQ29uZmlnLFxuICAgIHByaXZhdGUgX2VsUmVmOiBFbGVtZW50UmVmLFxuICAgIHByaXZhdGUgX3JlbmRlcmVyOiBSZW5kZXJlcjJcbiAgKSB7IH1cblxuICBuZ09uSW5pdCgpOiB2b2lkIHtcblxuICAgIGlmICh0aGlzLmRheT8uaXNUb2RheSAmJiB0aGlzLl9jb25maWcgJiYgdGhpcy5fY29uZmlnLmN1c3RvbVRvZGF5Q2xhc3MpIHtcbiAgICAgIHRoaXMuX3JlbmRlcmVyLmFkZENsYXNzKHRoaXMuX2VsUmVmLm5hdGl2ZUVsZW1lbnQsIHRoaXMuX2NvbmZpZy5jdXN0b21Ub2RheUNsYXNzKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHRoaXMuZGF5Py5jdXN0b21DbGFzc2VzID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5kYXk/LmN1c3RvbUNsYXNzZXMuc3BsaXQoJyAnKVxuICAgICAgICAuZmlsdGVyKChjbGFzc05hbWU6IHN0cmluZykgPT4gY2xhc3NOYW1lKVxuICAgICAgICAuZm9yRWFjaCgoY2xhc3NOYW1lOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICB0aGlzLl9yZW5kZXJlci5hZGRDbGFzcyh0aGlzLl9lbFJlZi5uYXRpdmVFbGVtZW50LCBjbGFzc05hbWUpO1xuICAgICAgICB9KTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==