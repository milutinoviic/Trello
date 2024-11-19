import { ChangeDetectorRef, ContentChildren, Directive, forwardRef, HostBinding, HostListener, QueryList } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { ButtonRadioDirective } from './button-radio.directive';
import * as i0 from "@angular/core";
export const RADIO_CONTROL_VALUE_ACCESSOR = {
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => ButtonRadioGroupDirective),
    multi: true
};
/**
 * A group of radio buttons.
 * A value of a selected button is bound to a variable specified via ngModel.
 */
export class ButtonRadioGroupDirective {
    constructor(cdr) {
        this.cdr = cdr;
        this.onChange = Function.prototype;
        this.onTouched = Function.prototype;
        this.role = 'radiogroup';
        this._disabled = false;
    }
    get value() {
        return this._value;
    }
    set value(value) {
        this._value = value;
        this.onChange(value);
    }
    get disabled() {
        return this._disabled;
    }
    get tabindex() {
        if (this._disabled) {
            return null;
        }
        else {
            return 0;
        }
    }
    writeValue(value) {
        this._value = value;
        this.cdr.markForCheck();
    }
    registerOnChange(fn) {
        this.onChange = fn;
    }
    registerOnTouched(fn) {
        this.onTouched = fn;
    }
    setDisabledState(disabled) {
        if (this.radioButtons) {
            this._disabled = disabled;
            this.radioButtons.forEach(buttons => {
                buttons.setDisabledState(disabled);
            });
            this.cdr.markForCheck();
        }
    }
    onFocus() {
        if (this._disabled) {
            return;
        }
        const activeRadio = this.getActiveOrFocusedRadio();
        if (activeRadio) {
            activeRadio.focus();
            return;
        }
        if (this.radioButtons) {
            const firstEnabled = this.radioButtons.find(r => !r.disabled);
            if (firstEnabled) {
                firstEnabled.focus();
            }
        }
    }
    onBlur() {
        if (this.onTouched) {
            this.onTouched();
        }
    }
    selectNext(event) {
        this.selectInDirection('next');
        event.preventDefault();
    }
    selectPrevious(event) {
        this.selectInDirection('previous');
        event.preventDefault();
    }
    selectInDirection(direction) {
        if (this._disabled) {
            return;
        }
        function nextIndex(currentIndex, buttonRadioDirectives) {
            const step = direction === 'next' ? 1 : -1;
            let calcIndex = (currentIndex + step) % buttonRadioDirectives.length;
            if (calcIndex < 0) {
                calcIndex = buttonRadioDirectives.length - 1;
            }
            return calcIndex;
        }
        const activeRadio = this.getActiveOrFocusedRadio();
        if (activeRadio && this.radioButtons) {
            const buttonRadioDirectives = this.radioButtons.toArray();
            const currentActiveIndex = buttonRadioDirectives.indexOf(activeRadio);
            for (let i = nextIndex(currentActiveIndex, buttonRadioDirectives); i !== currentActiveIndex; i = nextIndex(i, buttonRadioDirectives)) {
                if (buttonRadioDirectives[i].canToggle()) {
                    buttonRadioDirectives[i].toggleIfAllowed();
                    buttonRadioDirectives[i].focus();
                    break;
                }
            }
        }
    }
    getActiveOrFocusedRadio() {
        if (!this.radioButtons) {
            return void 0;
        }
        return this.radioButtons.find(button => button.isActive)
            || this.radioButtons.find(button => button.hasFocus);
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: ButtonRadioGroupDirective, deps: [{ token: i0.ChangeDetectorRef }], target: i0.ɵɵFactoryTarget.Directive }); }
    static { this.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "18.0.1", type: ButtonRadioGroupDirective, isStandalone: true, selector: "[btnRadioGroup]", host: { listeners: { "focus": "onFocus()", "blur": "onBlur()", "keydown.ArrowRight": "selectNext($event)", "keydown.ArrowDown": "selectNext($event)", "keydown.ArrowLeft": "selectPrevious($event)", "keydown.ArrowUp": "selectPrevious($event)" }, properties: { "attr.role": "this.role", "attr.tabindex": "this.tabindex" } }, providers: [RADIO_CONTROL_VALUE_ACCESSOR], queries: [{ propertyName: "radioButtons", predicate: i0.forwardRef(() => ButtonRadioDirective) }], ngImport: i0 }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: ButtonRadioGroupDirective, decorators: [{
            type: Directive,
            args: [{
                    selector: '[btnRadioGroup]',
                    providers: [RADIO_CONTROL_VALUE_ACCESSOR],
                    standalone: true
                }]
        }], ctorParameters: () => [{ type: i0.ChangeDetectorRef }], propDecorators: { role: [{
                type: HostBinding,
                args: ['attr.role']
            }], radioButtons: [{
                type: ContentChildren,
                args: [forwardRef(() => ButtonRadioDirective)]
            }], tabindex: [{
                type: HostBinding,
                args: ['attr.tabindex']
            }], onFocus: [{
                type: HostListener,
                args: ['focus']
            }], onBlur: [{
                type: HostListener,
                args: ['blur']
            }], selectNext: [{
                type: HostListener,
                args: ['keydown.ArrowRight', ['$event']]
            }, {
                type: HostListener,
                args: ['keydown.ArrowDown', ['$event']]
            }], selectPrevious: [{
                type: HostListener,
                args: ['keydown.ArrowLeft', ['$event']]
            }, {
                type: HostListener,
                args: ['keydown.ArrowUp', ['$event']]
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnV0dG9uLXJhZGlvLWdyb3VwLmRpcmVjdGl2ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9idXR0b25zL2J1dHRvbi1yYWRpby1ncm91cC5kaXJlY3RpdmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUNMLGlCQUFpQixFQUNqQixlQUFlLEVBQ2YsU0FBUyxFQUNULFVBQVUsRUFDVixXQUFXLEVBQ1gsWUFBWSxFQUVaLFNBQVMsRUFDVixNQUFNLGVBQWUsQ0FBQztBQUN2QixPQUFPLEVBQXdCLGlCQUFpQixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDekUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7O0FBRWhFLE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFhO0lBQ3BELE9BQU8sRUFBRSxpQkFBaUI7SUFDMUIsV0FBVyxFQUFFLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQztJQUN4RCxLQUFLLEVBQUUsSUFBSTtDQUNaLENBQUM7QUFFRjs7O0dBR0c7QUFNSCxNQUFNLE9BQU8seUJBQXlCO0lBU3BDLFlBQW9CLEdBQXNCO1FBQXRCLFFBQUcsR0FBSCxHQUFHLENBQW1CO1FBUjFDLGFBQVEsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDO1FBQzlCLGNBQVMsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDO1FBRUksU0FBSSxHQUFXLFlBQVksQ0FBQztRQW1CdkQsY0FBUyxHQUFHLEtBQUssQ0FBQztJQWIxQixDQUFDO0lBSUQsSUFBSSxLQUFLO1FBQ1AsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3JCLENBQUM7SUFFRCxJQUFJLEtBQUssQ0FBQyxLQUEwQjtRQUNsQyxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztRQUNwQixJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7SUFJRCxJQUFJLFFBQVE7UUFD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QUFvQjs7MkZBTjNDLHlCQUF5QjtrQkFMckMsU0FBUzttQkFBQztvQkFDUCxRQUFRLEVBQUUsaUJBQWlCO29CQUMzQixTQUFTLEVBQUUsQ0FBQyw0QkFBNEIsQ0FBQztvQkFDekMsVUFBVSxFQUFFLElBQUk7aUJBQ25CO3NGQUtvQyxJQUFJO3NCQUF0QyxXQUFXO3VCQUFDLFdBQVc7Z0JBR3hCLFlBQVk7c0JBRFgsZUFBZTt1QkFBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsb0JBQW9CLENBQUM7Z0JBd0JuRCxRQUFRO3NCQURYLFdBQVc7dUJBQUMsZUFBZTtnQkFpQzVCLE9BQU87c0JBRE4sWUFBWTt1QkFBQyxPQUFPO2dCQW9CckIsTUFBTTtzQkFETCxZQUFZO3VCQUFDLE1BQU07Z0JBU3BCLFVBQVU7c0JBRlQsWUFBWTt1QkFBQyxvQkFBb0IsRUFBRSxDQUFDLFFBQVEsQ0FBQzs7c0JBQzdDLFlBQVk7dUJBQUMsbUJBQW1CLEVBQUUsQ0FBQyxRQUFRLENBQUM7Z0JBUTdDLGNBQWM7c0JBRmIsWUFBWTt1QkFBQyxtQkFBbUIsRUFBRSxDQUFDLFFBQVEsQ0FBQzs7c0JBQzVDLFlBQVk7dUJBQUMsaUJBQWlCLEVBQUUsQ0FBQyxRQUFRLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBDaGFuZ2VEZXRlY3RvclJlZixcbiAgQ29udGVudENoaWxkcmVuLFxuICBEaXJlY3RpdmUsXG4gIGZvcndhcmRSZWYsXG4gIEhvc3RCaW5kaW5nLFxuICBIb3N0TGlzdGVuZXIsXG4gIFByb3ZpZGVyLFxuICBRdWVyeUxpc3Rcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBDb250cm9sVmFsdWVBY2Nlc3NvciwgTkdfVkFMVUVfQUNDRVNTT1IgfSBmcm9tICdAYW5ndWxhci9mb3Jtcyc7XG5pbXBvcnQgeyBCdXR0b25SYWRpb0RpcmVjdGl2ZSB9IGZyb20gJy4vYnV0dG9uLXJhZGlvLmRpcmVjdGl2ZSc7XG5cbmV4cG9ydCBjb25zdCBSQURJT19DT05UUk9MX1ZBTFVFX0FDQ0VTU09SOiBQcm92aWRlciA9IHtcbiAgcHJvdmlkZTogTkdfVkFMVUVfQUNDRVNTT1IsXG4gIHVzZUV4aXN0aW5nOiBmb3J3YXJkUmVmKCgpID0+IEJ1dHRvblJhZGlvR3JvdXBEaXJlY3RpdmUpLFxuICBtdWx0aTogdHJ1ZVxufTtcblxuLyoqXG4gKiBBIGdyb3VwIG9mIHJhZGlvIGJ1dHRvbnMuXG4gKiBBIHZhbHVlIG9mIGEgc2VsZWN0ZWQgYnV0dG9uIGlzIGJvdW5kIHRvIGEgdmFyaWFibGUgc3BlY2lmaWVkIHZpYSBuZ01vZGVsLlxuICovXG5ARGlyZWN0aXZlKHtcbiAgICBzZWxlY3RvcjogJ1tidG5SYWRpb0dyb3VwXScsXG4gICAgcHJvdmlkZXJzOiBbUkFESU9fQ09OVFJPTF9WQUxVRV9BQ0NFU1NPUl0sXG4gICAgc3RhbmRhbG9uZTogdHJ1ZVxufSlcbmV4cG9ydCBjbGFzcyBCdXR0b25SYWRpb0dyb3VwRGlyZWN0aXZlIGltcGxlbWVudHMgQ29udHJvbFZhbHVlQWNjZXNzb3Ige1xuICBvbkNoYW5nZSA9IEZ1bmN0aW9uLnByb3RvdHlwZTtcbiAgb25Ub3VjaGVkID0gRnVuY3Rpb24ucHJvdG90eXBlO1xuXG4gIEBIb3N0QmluZGluZygnYXR0ci5yb2xlJykgcmVhZG9ubHkgcm9sZTogc3RyaW5nID0gJ3JhZGlvZ3JvdXAnO1xuXG4gIEBDb250ZW50Q2hpbGRyZW4oZm9yd2FyZFJlZigoKSA9PiBCdXR0b25SYWRpb0RpcmVjdGl2ZSkpXG4gIHJhZGlvQnV0dG9ucz86IFF1ZXJ5TGlzdDxCdXR0b25SYWRpb0RpcmVjdGl2ZT47XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBjZHI6IENoYW5nZURldGVjdG9yUmVmKSB7XG4gIH1cblxuICBwcml2YXRlIF92YWx1ZT86IHVua25vd247XG5cbiAgZ2V0IHZhbHVlKCkge1xuICAgIHJldHVybiB0aGlzLl92YWx1ZTtcbiAgfVxuXG4gIHNldCB2YWx1ZSh2YWx1ZTogdW5rbm93biB8IHVuZGVmaW5lZCkge1xuICAgIHRoaXMuX3ZhbHVlID0gdmFsdWU7XG4gICAgdGhpcy5vbkNoYW5nZSh2YWx1ZSk7XG4gIH1cblxuICBwcml2YXRlIF9kaXNhYmxlZCA9IGZhbHNlO1xuXG4gIGdldCBkaXNhYmxlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fZGlzYWJsZWQ7XG4gIH1cblxuICBASG9zdEJpbmRpbmcoJ2F0dHIudGFiaW5kZXgnKVxuICBnZXQgdGFiaW5kZXgoKTogbnVsbCB8IG51bWJlciB7XG4gICAgaWYgKHRoaXMuX2Rpc2FibGVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICB9XG5cbiAgd3JpdGVWYWx1ZSh2YWx1ZT86IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMuX3ZhbHVlID0gdmFsdWU7XG4gICAgdGhpcy5jZHIubWFya0ZvckNoZWNrKCk7XG4gIH1cblxuICByZWdpc3Rlck9uQ2hhbmdlKGZuOiAoKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy5vbkNoYW5nZSA9IGZuO1xuICB9XG5cbiAgcmVnaXN0ZXJPblRvdWNoZWQoZm46ICgpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLm9uVG91Y2hlZCA9IGZuO1xuICB9XG5cbiAgc2V0RGlzYWJsZWRTdGF0ZShkaXNhYmxlZDogYm9vbGVhbik6IHZvaWQge1xuICAgIGlmICh0aGlzLnJhZGlvQnV0dG9ucykge1xuICAgICAgdGhpcy5fZGlzYWJsZWQgPSBkaXNhYmxlZDtcbiAgICAgIHRoaXMucmFkaW9CdXR0b25zLmZvckVhY2goYnV0dG9ucyA9PiB7XG4gICAgICAgIGJ1dHRvbnMuc2V0RGlzYWJsZWRTdGF0ZShkaXNhYmxlZCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMuY2RyLm1hcmtGb3JDaGVjaygpO1xuICAgIH1cbiAgfVxuXG4gIEBIb3N0TGlzdGVuZXIoJ2ZvY3VzJylcbiAgb25Gb2N1cygpIHtcbiAgICBpZiAodGhpcy5fZGlzYWJsZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgYWN0aXZlUmFkaW8gPSB0aGlzLmdldEFjdGl2ZU9yRm9jdXNlZFJhZGlvKCk7XG4gICAgaWYgKGFjdGl2ZVJhZGlvKSB7XG4gICAgICBhY3RpdmVSYWRpby5mb2N1cygpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnJhZGlvQnV0dG9ucykge1xuICAgICAgY29uc3QgZmlyc3RFbmFibGVkID0gdGhpcy5yYWRpb0J1dHRvbnMuZmluZChyID0+ICFyLmRpc2FibGVkKTtcbiAgICAgIGlmIChmaXJzdEVuYWJsZWQpIHtcbiAgICAgICAgZmlyc3RFbmFibGVkLmZvY3VzKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgQEhvc3RMaXN0ZW5lcignYmx1cicpXG4gIG9uQmx1cigpIHtcbiAgICBpZiAodGhpcy5vblRvdWNoZWQpIHtcbiAgICAgIHRoaXMub25Ub3VjaGVkKCk7XG4gICAgfVxuICB9XG5cbiAgQEhvc3RMaXN0ZW5lcigna2V5ZG93bi5BcnJvd1JpZ2h0JywgWyckZXZlbnQnXSlcbiAgQEhvc3RMaXN0ZW5lcigna2V5ZG93bi5BcnJvd0Rvd24nLCBbJyRldmVudCddKVxuICBzZWxlY3ROZXh0KGV2ZW50OiBLZXlib2FyZEV2ZW50KSB7XG4gICAgdGhpcy5zZWxlY3RJbkRpcmVjdGlvbignbmV4dCcpO1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gIH1cblxuICBASG9zdExpc3RlbmVyKCdrZXlkb3duLkFycm93TGVmdCcsIFsnJGV2ZW50J10pXG4gIEBIb3N0TGlzdGVuZXIoJ2tleWRvd24uQXJyb3dVcCcsIFsnJGV2ZW50J10pXG4gIHNlbGVjdFByZXZpb3VzKGV2ZW50OiBLZXlib2FyZEV2ZW50KSB7XG4gICAgdGhpcy5zZWxlY3RJbkRpcmVjdGlvbigncHJldmlvdXMnKTtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICB9XG5cbiAgcHJpdmF0ZSBzZWxlY3RJbkRpcmVjdGlvbihkaXJlY3Rpb246ICduZXh0JyB8ICdwcmV2aW91cycpIHtcbiAgICBpZiAodGhpcy5fZGlzYWJsZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBuZXh0SW5kZXgoY3VycmVudEluZGV4OiBudW1iZXIsIGJ1dHRvblJhZGlvRGlyZWN0aXZlczogQnV0dG9uUmFkaW9EaXJlY3RpdmVbXSkge1xuICAgICAgY29uc3Qgc3RlcCA9IGRpcmVjdGlvbiA9PT0gJ25leHQnID8gMSA6IC0xO1xuICAgICAgbGV0IGNhbGNJbmRleCA9IChjdXJyZW50SW5kZXggKyBzdGVwKSAlIGJ1dHRvblJhZGlvRGlyZWN0aXZlcy5sZW5ndGg7XG4gICAgICBpZiAoY2FsY0luZGV4IDwgMCkge1xuICAgICAgICBjYWxjSW5kZXggPSBidXR0b25SYWRpb0RpcmVjdGl2ZXMubGVuZ3RoIC0gMTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGNhbGNJbmRleDtcbiAgICB9XG5cbiAgICBjb25zdCBhY3RpdmVSYWRpbyA9IHRoaXMuZ2V0QWN0aXZlT3JGb2N1c2VkUmFkaW8oKTtcblxuICAgIGlmIChhY3RpdmVSYWRpbyAmJiB0aGlzLnJhZGlvQnV0dG9ucykge1xuICAgICAgY29uc3QgYnV0dG9uUmFkaW9EaXJlY3RpdmVzID0gdGhpcy5yYWRpb0J1dHRvbnMudG9BcnJheSgpO1xuICAgICAgY29uc3QgY3VycmVudEFjdGl2ZUluZGV4ID0gYnV0dG9uUmFkaW9EaXJlY3RpdmVzLmluZGV4T2YoYWN0aXZlUmFkaW8pO1xuICAgICAgZm9yIChcbiAgICAgICAgbGV0IGkgPSBuZXh0SW5kZXgoY3VycmVudEFjdGl2ZUluZGV4LCBidXR0b25SYWRpb0RpcmVjdGl2ZXMpO1xuICAgICAgICBpICE9PSBjdXJyZW50QWN0aXZlSW5kZXg7XG4gICAgICAgIGkgPSBuZXh0SW5kZXgoaSwgYnV0dG9uUmFkaW9EaXJlY3RpdmVzKVxuICAgICAgKSB7XG4gICAgICAgIGlmIChidXR0b25SYWRpb0RpcmVjdGl2ZXNbaV0uY2FuVG9nZ2xlKCkpIHtcbiAgICAgICAgICBidXR0b25SYWRpb0RpcmVjdGl2ZXNbaV0udG9nZ2xlSWZBbGxvd2VkKCk7XG4gICAgICAgICAgYnV0dG9uUmFkaW9EaXJlY3RpdmVzW2ldLmZvY3VzKCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldEFjdGl2ZU9yRm9jdXNlZFJhZGlvKCk6IEJ1dHRvblJhZGlvRGlyZWN0aXZlIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoIXRoaXMucmFkaW9CdXR0b25zKSB7XG4gICAgICByZXR1cm4gdm9pZCAwO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJhZGlvQnV0dG9ucy5maW5kKGJ1dHRvbiA9PiBidXR0b24uaXNBY3RpdmUpXG4gICAgICB8fCB0aGlzLnJhZGlvQnV0dG9ucy5maW5kKGJ1dHRvbiA9PiBidXR0b24uaGFzRm9jdXMpO1xuICB9XG59XG4iXX0=