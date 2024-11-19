import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, forwardRef, Input, Output, ViewEncapsulation } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { TimepickerActions } from './reducer/timepicker.actions';
import { TimepickerStore } from './reducer/timepicker.store';
import { getControlsValue } from './timepicker-controls.util';
import { TimepickerConfig } from './timepicker.config';
import { isHourInputValid, isInputLimitValid, isInputValid, isMinuteInputValid, isOneOfDatesEmpty, isSecondInputValid, isValidDate, padNumber, parseTime } from './timepicker.utils';
import { NgIf } from '@angular/common';
import * as i0 from "@angular/core";
import * as i1 from "./timepicker.config";
import * as i2 from "./reducer/timepicker.store";
import * as i3 from "./reducer/timepicker.actions";
export const TIMEPICKER_CONTROL_VALUE_ACCESSOR = {
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => TimepickerComponent),
    multi: true
};
export class TimepickerComponent {
    constructor(_config, _cd, _store, _timepickerActions) {
        this._cd = _cd;
        this._store = _store;
        this._timepickerActions = _timepickerActions;
        /** hours change step */
        this.hourStep = 1;
        /** minutes change step */
        this.minuteStep = 5;
        /** seconds change step */
        this.secondsStep = 10;
        /** if true hours and minutes fields will be readonly */
        this.readonlyInput = false;
        /** if true hours and minutes fields will be disabled */
        this.disabled = false;
        /** if true scroll inside hours and minutes inputs will change time */
        this.mousewheel = true;
        /** if true the values of hours and minutes can be changed using the up/down arrow keys on the keyboard */
        this.arrowkeys = true;
        /** if true spinner arrows above and below the inputs will be shown */
        this.showSpinners = true;
        /** if true meridian button will be shown */
        this.showMeridian = true;
        /** show minutes in timepicker */
        this.showMinutes = true;
        /** show seconds in timepicker */
        this.showSeconds = false;
        /** meridian labels based on locale */
        this.meridians = ['AM', 'PM'];
        /** placeholder for hours field in timepicker */
        this.hoursPlaceholder = 'HH';
        /** placeholder for minutes field in timepicker */
        this.minutesPlaceholder = 'MM';
        /** placeholder for seconds field in timepicker */
        this.secondsPlaceholder = 'SS';
        /** emits true if value is a valid date */
        this.isValid = new EventEmitter();
        /** emits value of meridian*/
        this.meridianChange = new EventEmitter();
        // ui variables
        this.hours = '';
        this.minutes = '';
        this.seconds = '';
        this.meridian = '';
        // min\max validation for input fields
        this.invalidHours = false;
        this.invalidMinutes = false;
        this.invalidSeconds = false;
        // aria-label variables
        this.labelHours = 'hours';
        this.labelMinutes = 'minutes';
        this.labelSeconds = 'seconds';
        // time picker controls state
        this.canIncrementHours = true;
        this.canIncrementMinutes = true;
        this.canIncrementSeconds = true;
        this.canDecrementHours = true;
        this.canDecrementMinutes = true;
        this.canDecrementSeconds = true;
        this.canToggleMeridian = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.onChange = Function.prototype;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.onTouched = Function.prototype;
        this.config = _config;
        Object.assign(this, this.config);
        this.timepickerSub = _store.select(state => state.value)
            .subscribe((value) => {
            // update UI values if date changed
            this._renderTime(value);
            this.onChange(value);
            this._store.dispatch(this._timepickerActions.updateControls(getControlsValue(this)));
        });
        _store.select(state => state.controls)
            .subscribe((controlsState) => {
            const isTimepickerInputValid = isInputValid(this.hours, this.minutes, this.seconds, this.isPM());
            const isValid = this.config.allowEmptyTime ?
                this.isOneOfDatesIsEmpty() || isTimepickerInputValid
                : isTimepickerInputValid;
            this.isValid.emit(isValid);
            Object.assign(this, controlsState);
            _cd.markForCheck();
        });
    }
    /** @deprecated - please use `isEditable` instead */
    get isSpinnersVisible() {
        return this.showSpinners && !this.readonlyInput;
    }
    get isEditable() {
        return !(this.readonlyInput || this.disabled);
    }
    resetValidation() {
        this.invalidHours = false;
        this.invalidMinutes = false;
        this.invalidSeconds = false;
    }
    isPM() {
        return this.showMeridian && this.meridian === this.meridians[1];
    }
    prevDef($event) {
        $event.preventDefault();
    }
    wheelSign($event) {
        return Math.sign($event.deltaY || 0) * -1;
    }
    ngOnChanges() {
        this._store.dispatch(this._timepickerActions.updateControls(getControlsValue(this)));
    }
    changeHours(step, source = '') {
        this.resetValidation();
        this._store.dispatch(this._timepickerActions.changeHours({ step, source }));
    }
    changeMinutes(step, source = '') {
        this.resetValidation();
        this._store.dispatch(this._timepickerActions.changeMinutes({ step, source }));
    }
    changeSeconds(step, source = '') {
        this.resetValidation();
        this._store.dispatch(this._timepickerActions.changeSeconds({ step, source }));
    }
    updateHours(target) {
        this.resetValidation();
        this.hours = target.value;
        const isTimepickerInputValid = isHourInputValid(this.hours, this.isPM()) && this.isValidLimit();
        const isValid = this.config.allowEmptyTime ?
            this.isOneOfDatesIsEmpty() || isTimepickerInputValid
            : isTimepickerInputValid;
        if (!isValid) {
            this.invalidHours = true;
            this.isValid.emit(false);
            this.onChange(null);
            return;
        }
        this._updateTime();
    }
    updateMinutes(target) {
        this.resetValidation();
        this.minutes = target.value;
        const isTimepickerInputValid = isMinuteInputValid(this.minutes) && this.isValidLimit();
        const isValid = this.config.allowEmptyTime ?
            this.isOneOfDatesIsEmpty() || isTimepickerInputValid
            : isTimepickerInputValid;
        if (!isValid) {
            this.invalidMinutes = true;
            this.isValid.emit(false);
            this.onChange(null);
            return;
        }
        this._updateTime();
    }
    updateSeconds(target) {
        this.resetValidation();
        this.seconds = target.value;
        const isTimepickerInputValid = isSecondInputValid(this.seconds) && this.isValidLimit();
        const isValid = this.config.allowEmptyTime ?
            this.isOneOfDatesIsEmpty() || isTimepickerInputValid
            : isTimepickerInputValid;
        if (!isValid) {
            this.invalidSeconds = true;
            this.isValid.emit(false);
            this.onChange(null);
            return;
        }
        this._updateTime();
    }
    isValidLimit() {
        return isInputLimitValid({
            hour: this.hours,
            minute: this.minutes,
            seconds: this.seconds,
            isPM: this.isPM()
        }, this.max, this.min);
    }
    isOneOfDatesIsEmpty() {
        return isOneOfDatesEmpty(this.hours, this.minutes, this.seconds);
    }
    _updateTime() {
        const _seconds = this.showSeconds ? this.seconds : void 0;
        const _minutes = this.showMinutes ? this.minutes : void 0;
        const isTimepickerInputValid = isInputValid(this.hours, _minutes, _seconds, this.isPM());
        const isValid = this.config.allowEmptyTime ?
            this.isOneOfDatesIsEmpty() || isTimepickerInputValid
            : isTimepickerInputValid;
        if (!isValid) {
            this.isValid.emit(false);
            this.onChange(null);
            return;
        }
        this._store.dispatch(this._timepickerActions.setTime({
            hour: this.hours,
            minute: this.minutes,
            seconds: this.seconds,
            isPM: this.isPM()
        }));
    }
    toggleMeridian() {
        if (!this.showMeridian || !this.isEditable) {
            return;
        }
        const _hoursPerDayHalf = 12;
        this._store.dispatch(this._timepickerActions.changeHours({
            step: _hoursPerDayHalf,
            source: ''
        }));
    }
    /**
     * Write a new value to the element.
     */
    writeValue(obj) {
        if (isValidDate(obj)) {
            this.resetValidation();
            this._store.dispatch(this._timepickerActions.writeValue(parseTime(obj)));
        }
        else if (obj == null) {
            this._store.dispatch(this._timepickerActions.writeValue());
        }
    }
    /**
     * Set the function to be called when the control receives a change event.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerOnChange(fn) {
        this.onChange = fn;
    }
    /**
     * Set the function to be called when the control receives a touch event.
     */
    registerOnTouched(fn) {
        this.onTouched = fn;
    }
    /**
     * This function is called when the control status changes to or from "disabled".
     * Depending on the value, it will enable or disable the appropriate DOM element.
     *
     * @param isDisabled
     */
    setDisabledState(isDisabled) {
        this.disabled = isDisabled;
        this._cd.markForCheck();
    }
    ngOnDestroy() {
        this.timepickerSub?.unsubscribe();
    }
    _renderTime(value) {
        if (!value || !isValidDate(value)) {
            this.hours = '';
            this.minutes = '';
            this.seconds = '';
            this.meridian = this.meridians[0];
            this.meridianChange.emit(this.meridian);
            return;
        }
        const _value = parseTime(value);
        if (!_value) {
            return;
        }
        const _hoursPerDayHalf = 12;
        let _hours = _value.getHours();
        if (this.showMeridian) {
            this.meridian = this.meridians[_hours >= _hoursPerDayHalf ? 1 : 0];
            this.meridianChange.emit(this.meridian);
            _hours = _hours % _hoursPerDayHalf;
            // should be 12 PM, not 00 PM
            if (_hours === 0) {
                _hours = _hoursPerDayHalf;
            }
        }
        this.hours = padNumber(_hours);
        this.minutes = padNumber(_value.getMinutes());
        this.seconds = padNumber(_value.getUTCSeconds());
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: TimepickerComponent, deps: [{ token: i1.TimepickerConfig }, { token: i0.ChangeDetectorRef }, { token: i2.TimepickerStore }, { token: i3.TimepickerActions }], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "18.0.1", type: TimepickerComponent, isStandalone: true, selector: "timepicker", inputs: { hourStep: "hourStep", minuteStep: "minuteStep", secondsStep: "secondsStep", readonlyInput: "readonlyInput", disabled: "disabled", mousewheel: "mousewheel", arrowkeys: "arrowkeys", showSpinners: "showSpinners", showMeridian: "showMeridian", showMinutes: "showMinutes", showSeconds: "showSeconds", meridians: "meridians", min: "min", max: "max", hoursPlaceholder: "hoursPlaceholder", minutesPlaceholder: "minutesPlaceholder", secondsPlaceholder: "secondsPlaceholder" }, outputs: { isValid: "isValid", meridianChange: "meridianChange" }, providers: [TIMEPICKER_CONTROL_VALUE_ACCESSOR, TimepickerStore, TimepickerActions], usesOnChanges: true, ngImport: i0, template: "<table>\n  <tbody>\n  <tr class=\"text-center\" [hidden]=\"!showSpinners\">\n    <!-- increment hours button-->\n    <td>\n      <a class=\"btn btn-link\" [class.disabled]=\"!canIncrementHours || !isEditable\"\n         (click)=\"changeHours(hourStep)\"\n         href=\"javascript:void(0);\"\n      ><span class=\"bs-chevron bs-chevron-up\"></span></a>\n    </td>\n    <!-- divider -->\n    <td *ngIf=\"showMinutes\">&nbsp;&nbsp;&nbsp;</td>\n    <!-- increment minutes button -->\n    <td *ngIf=\"showMinutes\">\n      <a class=\"btn btn-link\" [class.disabled]=\"!canIncrementMinutes || !isEditable\"\n         (click)=\"changeMinutes(minuteStep)\"\n         href=\"javascript:void(0);\"\n      ><span class=\"bs-chevron bs-chevron-up\"></span></a>\n    </td>\n    <!-- divider -->\n    <td *ngIf=\"showSeconds\">&nbsp;</td>\n    <!-- increment seconds button -->\n    <td *ngIf=\"showSeconds\">\n      <a class=\"btn btn-link\" [class.disabled]=\"!canIncrementSeconds || !isEditable\"\n         (click)=\"changeSeconds(secondsStep)\"\n         href=\"javascript:void(0);\"\n      >\n        <span class=\"bs-chevron bs-chevron-up\"></span>\n      </a>\n    </td>\n    <!-- space between -->\n    <td *ngIf=\"showMeridian\">&nbsp;&nbsp;&nbsp;</td>\n    <!-- meridian placeholder-->\n    <td *ngIf=\"showMeridian\"></td>\n  </tr>\n  <tr>\n    <!-- hours -->\n    <td class=\"form-group mb-3\" [class.has-error]=\"invalidHours\">\n      <input type=\"text\" [class.is-invalid]=\"invalidHours\"\n             class=\"form-control text-center bs-timepicker-field\"\n             [placeholder]=\"hoursPlaceholder\"\n             maxlength=\"2\"\n             [readonly]=\"readonlyInput\"\n             [disabled]=\"disabled\"\n             [value]=\"hours\"\n             (wheel)=\"prevDef($event);changeHours(hourStep * wheelSign($event), 'wheel')\"\n             (keydown.ArrowUp)=\"changeHours(hourStep, 'key')\"\n             (keydown.ArrowDown)=\"changeHours(-hourStep, 'key')\"\n             (change)=\"updateHours($event.target)\" [attr.aria-label]=\"labelHours\"></td>\n    <!-- divider -->\n    <td *ngIf=\"showMinutes\">&nbsp;:&nbsp;</td>\n    <!-- minutes -->\n    <td class=\"form-group mb-3\" *ngIf=\"showMinutes\" [class.has-error]=\"invalidMinutes\">\n      <input type=\"text\" [class.is-invalid]=\"invalidMinutes\"\n             class=\"form-control text-center bs-timepicker-field\"\n             [placeholder]=\"minutesPlaceholder\"\n             maxlength=\"2\"\n             [readonly]=\"readonlyInput\"\n             [disabled]=\"disabled\"\n             [value]=\"minutes\"\n             (wheel)=\"prevDef($event);changeMinutes(minuteStep * wheelSign($event), 'wheel')\"\n             (keydown.ArrowUp)=\"changeMinutes(minuteStep, 'key')\"\n             (keydown.ArrowDown)=\"changeMinutes(-minuteStep, 'key')\"\n             (change)=\"updateMinutes($event.target)\" [attr.aria-label]=\"labelMinutes\">\n    </td>\n    <!-- divider -->\n    <td *ngIf=\"showSeconds\">&nbsp;:&nbsp;</td>\n    <!-- seconds -->\n    <td class=\"form-group mb-3\" *ngIf=\"showSeconds\" [class.has-error]=\"invalidSeconds\">\n      <input type=\"text\" [class.is-invalid]=\"invalidSeconds\"\n             class=\"form-control text-center bs-timepicker-field\"\n             [placeholder]=\"secondsPlaceholder\"\n             maxlength=\"2\"\n             [readonly]=\"readonlyInput\"\n             [disabled]=\"disabled\"\n             [value]=\"seconds\"\n             (wheel)=\"prevDef($event);changeSeconds(secondsStep * wheelSign($event), 'wheel')\"\n             (keydown.ArrowUp)=\"changeSeconds(secondsStep, 'key')\"\n             (keydown.ArrowDown)=\"changeSeconds(-secondsStep, 'key')\"\n             (change)=\"updateSeconds($event.target)\" [attr.aria-label]=\"labelSeconds\">\n    </td>\n    <!-- space between -->\n    <td *ngIf=\"showMeridian\">&nbsp;&nbsp;&nbsp;</td>\n    <!-- meridian -->\n    <td *ngIf=\"showMeridian\">\n      <button type=\"button\" class=\"btn btn-default text-center\"\n              [disabled]=\"!isEditable || !canToggleMeridian\"\n              [class.disabled]=\"!isEditable || !canToggleMeridian\"\n              (click)=\"toggleMeridian()\"\n      >{{ meridian }}\n      </button>\n    </td>\n  </tr>\n  <tr class=\"text-center\" [hidden]=\"!showSpinners\">\n    <!-- decrement hours button-->\n    <td>\n      <a class=\"btn btn-link\" [class.disabled]=\"!canDecrementHours || !isEditable\"\n         (click)=\"changeHours(-hourStep)\"\n         href=\"javascript:void(0);\"\n      >\n        <span class=\"bs-chevron bs-chevron-down\"></span>\n      </a>\n    </td>\n    <!-- divider -->\n    <td *ngIf=\"showMinutes\">&nbsp;&nbsp;&nbsp;</td>\n    <!-- decrement minutes button-->\n    <td *ngIf=\"showMinutes\">\n      <a class=\"btn btn-link\" [class.disabled]=\"!canDecrementMinutes || !isEditable\"\n         (click)=\"changeMinutes(-minuteStep)\"\n         href=\"javascript:void(0);\"\n      >\n        <span class=\"bs-chevron bs-chevron-down\"></span>\n      </a>\n    </td>\n    <!-- divider -->\n    <td *ngIf=\"showSeconds\">&nbsp;</td>\n    <!-- decrement seconds button-->\n    <td *ngIf=\"showSeconds\">\n      <a class=\"btn btn-link\" [class.disabled]=\"!canDecrementSeconds || !isEditable\"\n         (click)=\"changeSeconds(-secondsStep)\"\n         href=\"javascript:void(0);\"\n      >\n        <span class=\"bs-chevron bs-chevron-down\"></span>\n      </a>\n    </td>\n    <!-- space between -->\n    <td *ngIf=\"showMeridian\">&nbsp;&nbsp;&nbsp;</td>\n    <!-- meridian placeholder-->\n    <td *ngIf=\"showMeridian\"></td>\n  </tr>\n  </tbody>\n</table>\n", styles: [".bs-chevron{border-style:solid;display:block;width:9px;height:9px;position:relative;border-width:3px 0px 0 3px}.bs-chevron-up{-webkit-transform:rotate(45deg);transform:rotate(45deg);top:2px}.bs-chevron-down{-webkit-transform:rotate(-135deg);transform:rotate(-135deg);top:-2px}.bs-timepicker-field{width:65px;padding:.375rem .55rem}\n"], dependencies: [{ kind: "directive", type: NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush, encapsulation: i0.ViewEncapsulation.None }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: TimepickerComponent, decorators: [{
            type: Component,
            args: [{ selector: 'timepicker', changeDetection: ChangeDetectionStrategy.OnPush, providers: [TIMEPICKER_CONTROL_VALUE_ACCESSOR, TimepickerStore, TimepickerActions], encapsulation: ViewEncapsulation.None, standalone: true, imports: [NgIf], template: "<table>\n  <tbody>\n  <tr class=\"text-center\" [hidden]=\"!showSpinners\">\n    <!-- increment hours button-->\n    <td>\n      <a class=\"btn btn-link\" [class.disabled]=\"!canIncrementHours || !isEditable\"\n         (click)=\"changeHours(hourStep)\"\n         href=\"javascript:void(0);\"\n      ><span class=\"bs-chevron bs-chevron-up\"></span></a>\n    </td>\n    <!-- divider -->\n    <td *ngIf=\"showMinutes\">&nbsp;&nbsp;&nbsp;</td>\n    <!-- increment minutes button -->\n    <td *ngIf=\"showMinutes\">\n      <a class=\"btn btn-link\" [class.disabled]=\"!canIncrementMinutes || !isEditable\"\n         (click)=\"changeMinutes(minuteStep)\"\n         href=\"javascript:void(0);\"\n      ><span class=\"bs-chevron bs-chevron-up\"></span></a>\n    </td>\n    <!-- divider -->\n    <td *ngIf=\"showSeconds\">&nbsp;</td>\n    <!-- increment seconds button -->\n    <td *ngIf=\"showSeconds\">\n      <a class=\"btn btn-link\" [class.disabled]=\"!canIncrementSeconds || !isEditable\"\n         (click)=\"changeSeconds(secondsStep)\"\n         href=\"javascript:void(0);\"\n      >\n        <span class=\"bs-chevron bs-chevron-up\"></span>\n      </a>\n    </td>\n    <!-- space between -->\n    <td *ngIf=\"showMeridian\">&nbsp;&nbsp;&nbsp;</td>\n    <!-- meridian placeholder-->\n    <td *ngIf=\"showMeridian\"></td>\n  </tr>\n  <tr>\n    <!-- hours -->\n    <td class=\"form-group mb-3\" [class.has-error]=\"invalidHours\">\n      <input type=\"text\" [class.is-invalid]=\"invalidHours\"\n             class=\"form-control text-center bs-timepicker-field\"\n             [placeholder]=\"hoursPlaceholder\"\n             maxlength=\"2\"\n             [readonly]=\"readonlyInput\"\n             [disabled]=\"disabled\"\n             [value]=\"hours\"\n             (wheel)=\"prevDef($event);changeHours(hourStep * wheelSign($event), 'wheel')\"\n             (keydown.ArrowUp)=\"changeHours(hourStep, 'key')\"\n             (keydown.ArrowDown)=\"changeHours(-hourStep, 'key')\"\n             (change)=\"updateHours($event.target)\" [attr.aria-label]=\"labelHours\"></td>\n    <!-- divider -->\n    <td *ngIf=\"showMinutes\">&nbsp;:&nbsp;</td>\n    <!-- minutes -->\n    <td class=\"form-group mb-3\" *ngIf=\"showMinutes\" [class.has-error]=\"invalidMinutes\">\n      <input type=\"text\" [class.is-invalid]=\"invalidMinutes\"\n             class=\"form-control text-center bs-timepicker-field\"\n             [placeholder]=\"minutesPlaceholder\"\n             maxlength=\"2\"\n             [readonly]=\"readonlyInput\"\n             [disabled]=\"disabled\"\n             [value]=\"minutes\"\n             (wheel)=\"prevDef($event);changeMinutes(minuteStep * wheelSign($event), 'wheel')\"\n             (keydown.ArrowUp)=\"changeMinutes(minuteStep, 'key')\"\n             (keydown.ArrowDown)=\"changeMinutes(-minuteStep, 'key')\"\n             (change)=\"updateMinutes($event.target)\" [attr.aria-label]=\"labelMinutes\">\n    </td>\n    <!-- divider -->\n    <td *ngIf=\"showSeconds\">&nbsp;:&nbsp;</td>\n    <!-- seconds -->\n    <td class=\"form-group mb-3\" *ngIf=\"showSeconds\" [class.has-error]=\"invalidSeconds\">\n      <input type=\"text\" [class.is-invalid]=\"invalidSeconds\"\n             class=\"form-control text-center bs-timepicker-field\"\n             [placeholder]=\"secondsPlaceholder\"\n             maxlength=\"2\"\n             [readonly]=\"readonlyInput\"\n             [disabled]=\"disabled\"\n             [value]=\"seconds\"\n             (wheel)=\"prevDef($event);changeSeconds(secondsStep * wheelSign($event), 'wheel')\"\n             (keydown.ArrowUp)=\"changeSeconds(secondsStep, 'key')\"\n             (keydown.ArrowDown)=\"changeSeconds(-secondsStep, 'key')\"\n             (change)=\"updateSeconds($event.target)\" [attr.aria-label]=\"labelSeconds\">\n    </td>\n    <!-- space between -->\n    <td *ngIf=\"showMeridian\">&nbsp;&nbsp;&nbsp;</td>\n    <!-- meridian -->\n    <td *ngIf=\"showMeridian\">\n      <button type=\"button\" class=\"btn btn-default text-center\"\n              [disabled]=\"!isEditable || !canToggleMeridian\"\n              [class.disabled]=\"!isEditable || !canToggleMeridian\"\n              (click)=\"toggleMeridian()\"\n      >{{ meridian }}\n      </button>\n    </td>\n  </tr>\n  <tr class=\"text-center\" [hidden]=\"!showSpinners\">\n    <!-- decrement hours button-->\n    <td>\n      <a class=\"btn btn-link\" [class.disabled]=\"!canDecrementHours || !isEditable\"\n         (click)=\"changeHours(-hourStep)\"\n         href=\"javascript:void(0);\"\n      >\n        <span class=\"bs-chevron bs-chevron-down\"></span>\n      </a>\n    </td>\n    <!-- divider -->\n    <td *ngIf=\"showMinutes\">&nbsp;&nbsp;&nbsp;</td>\n    <!-- decrement minutes button-->\n    <td *ngIf=\"showMinutes\">\n      <a class=\"btn btn-link\" [class.disabled]=\"!canDecrementMinutes || !isEditable\"\n         (click)=\"changeMinutes(-minuteStep)\"\n         href=\"javascript:void(0);\"\n      >\n        <span class=\"bs-chevron bs-chevron-down\"></span>\n      </a>\n    </td>\n    <!-- divider -->\n    <td *ngIf=\"showSeconds\">&nbsp;</td>\n    <!-- decrement seconds button-->\n    <td *ngIf=\"showSeconds\">\n      <a class=\"btn btn-link\" [class.disabled]=\"!canDecrementSeconds || !isEditable\"\n         (click)=\"changeSeconds(-secondsStep)\"\n         href=\"javascript:void(0);\"\n      >\n        <span class=\"bs-chevron bs-chevron-down\"></span>\n      </a>\n    </td>\n    <!-- space between -->\n    <td *ngIf=\"showMeridian\">&nbsp;&nbsp;&nbsp;</td>\n    <!-- meridian placeholder-->\n    <td *ngIf=\"showMeridian\"></td>\n  </tr>\n  </tbody>\n</table>\n", styles: [".bs-chevron{border-style:solid;display:block;width:9px;height:9px;position:relative;border-width:3px 0px 0 3px}.bs-chevron-up{-webkit-transform:rotate(45deg);transform:rotate(45deg);top:2px}.bs-chevron-down{-webkit-transform:rotate(-135deg);transform:rotate(-135deg);top:-2px}.bs-timepicker-field{width:65px;padding:.375rem .55rem}\n"] }]
        }], ctorParameters: () => [{ type: i1.TimepickerConfig }, { type: i0.ChangeDetectorRef }, { type: i2.TimepickerStore }, { type: i3.TimepickerActions }], propDecorators: { hourStep: [{
                type: Input
            }], minuteStep: [{
                type: Input
            }], secondsStep: [{
                type: Input
            }], readonlyInput: [{
                type: Input
            }], disabled: [{
                type: Input
            }], mousewheel: [{
                type: Input
            }], arrowkeys: [{
                type: Input
            }], showSpinners: [{
                type: Input
            }], showMeridian: [{
                type: Input
            }], showMinutes: [{
                type: Input
            }], showSeconds: [{
                type: Input
            }], meridians: [{
                type: Input
            }], min: [{
                type: Input
            }], max: [{
                type: Input
            }], hoursPlaceholder: [{
                type: Input
            }], minutesPlaceholder: [{
                type: Input
            }], secondsPlaceholder: [{
                type: Input
            }], isValid: [{
                type: Output
            }], meridianChange: [{
                type: Output
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZXBpY2tlci5jb21wb25lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvdGltZXBpY2tlci90aW1lcGlja2VyLmNvbXBvbmVudC50cyIsIi4uLy4uLy4uLy4uL3NyYy90aW1lcGlja2VyL3RpbWVwaWNrZXIuY29tcG9uZW50Lmh0bWwiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUNMLHVCQUF1QixFQUN2QixpQkFBaUIsRUFDakIsU0FBUyxFQUNULFlBQVksRUFDWixVQUFVLEVBQ1YsS0FBSyxFQUdMLE1BQU0sRUFDTixpQkFBaUIsRUFDbEIsTUFBTSxlQUFlLENBQUM7QUFFdkIsT0FBTyxFQUF3QixpQkFBaUIsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBTXpFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUM5RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUl2RCxPQUFPLEVBQ0wsZ0JBQWdCLEVBQ2hCLGlCQUFpQixFQUNqQixZQUFZLEVBQ1osa0JBQWtCLEVBQ2xCLGlCQUFpQixFQUNqQixrQkFBa0IsRUFDbEIsV0FBVyxFQUNYLFNBQVMsRUFDVCxTQUFTLEVBQ1YsTUFBTSxvQkFBb0IsQ0FBQztBQUM1QixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUJBQWlCLENBQUM7Ozs7O0FBRXZDLE1BQU0sQ0FBQyxNQUFNLGlDQUFpQyxHQUE4QjtJQUMxRSxPQUFPLEVBQUUsaUJBQWlCO0lBQzFCLFdBQVcsRUFBRSxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsbUJBQW1CLENBQUM7SUFDbEQsS0FBSyxFQUFFLElBQUk7Q0FDWixDQUFDO0FBc0NGLE1BQU0sT0FBTyxtQkFBbUI7SUEw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LFNBQVM7c0JBQWpCLEtBQUs7Z0JBRUcsR0FBRztzQkFBWCxLQUFLO2dCQUVHLEdBQUc7c0JBQVgsS0FBSztnQkFFRyxnQkFBZ0I7c0JBQXhCLEtBQUs7Z0JBRUcsa0JBQWtCO3NCQUExQixLQUFLO2dCQUVHLGtCQUFrQjtzQkFBMUIsS0FBSztnQkFFSSxPQUFPO3NCQUFoQixNQUFNO2dCQUVHLGNBQWM7c0JBQXZCLE1BQU0iLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSxcbiAgQ2hhbmdlRGV0ZWN0b3JSZWYsXG4gIENvbXBvbmVudCxcbiAgRXZlbnRFbWl0dGVyLFxuICBmb3J3YXJkUmVmLFxuICBJbnB1dCxcbiAgT25DaGFuZ2VzLFxuICBPbkRlc3Ryb3ksXG4gIE91dHB1dCxcbiAgVmlld0VuY2Fwc3VsYXRpb25cbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmltcG9ydCB7IENvbnRyb2xWYWx1ZUFjY2Vzc29yLCBOR19WQUxVRV9BQ0NFU1NPUiB9IGZyb20gJ0Bhbmd1bGFyL2Zvcm1zJztcblxuaW1wb3J0IHsgU3Vic2NyaXB0aW9uIH0gZnJvbSAncnhqcyc7XG5cbmltcG9ydCB7IENvbnRyb2xWYWx1ZUFjY2Vzc29yTW9kZWwgfSBmcm9tICcuL21vZGVscyc7XG5cbmltcG9ydCB7IFRpbWVwaWNrZXJBY3Rpb25zIH0gZnJvbSAnLi9yZWR1Y2VyL3RpbWVwaWNrZXIuYWN0aW9ucyc7XG5pbXBvcnQgeyBUaW1lcGlja2VyU3RvcmUgfSBmcm9tICcuL3JlZHVjZXIvdGltZXBpY2tlci5zdG9yZSc7XG5pbXBvcnQgeyBnZXRDb250cm9sc1ZhbHVlIH0gZnJvbSAnLi90aW1lcGlja2VyLWNvbnRyb2xzLnV0aWwnO1xuaW1wb3J0IHsgVGltZXBpY2tlckNvbmZpZyB9IGZyb20gJy4vdGltZXBpY2tlci5jb25maWcnO1xuXG5pbXBvcnQgeyBUaW1lQ2hhbmdlU291cmNlLCBUaW1lcGlja2VyQ29tcG9uZW50U3RhdGUsIFRpbWVwaWNrZXJDb250cm9scyB9IGZyb20gJy4vdGltZXBpY2tlci5tb2RlbHMnO1xuXG5pbXBvcnQge1xuICBpc0hvdXJJbnB1dFZhbGlkLFxuICBpc0lucHV0TGltaXRWYWxpZCxcbiAgaXNJbnB1dFZhbGlkLFxuICBpc01pbnV0ZUlucHV0VmFsaWQsXG4gIGlzT25lT2ZEYXRlc0VtcHR5LFxuICBpc1NlY29uZElucHV0VmFsaWQsXG4gIGlzVmFsaWREYXRlLFxuICBwYWROdW1iZXIsXG4gIHBhcnNlVGltZVxufSBmcm9tICcuL3RpbWVwaWNrZXIudXRpbHMnO1xuaW1wb3J0IHsgTmdJZiB9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5cbmV4cG9ydCBjb25zdCBUSU1FUElDS0VSX0NPTlRST0xfVkFMVUVfQUNDRVNTT1I6IENvbnRyb2xWYWx1ZUFjY2Vzc29yTW9kZWwgPSB7XG4gIHByb3ZpZGU6IE5HX1ZBTFVFX0FDQ0VTU09SLFxuICB1c2VFeGlzdGluZzogZm9yd2FyZFJlZigoKSA9PiBUaW1lcGlja2VyQ29tcG9uZW50KSxcbiAgbXVsdGk6IHRydWVcbn07XG5cbkBDb21wb25lbnQoe1xuICAgIHNlbGVjdG9yOiAndGltZXBpY2tlcicsXG4gICAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXG4gICAgcHJvdmlkZXJzOiBbVElNRVBJQ0tFUl9DT05UUk9MX1ZBTFVFX0FDQ0VTU09SLCBUaW1lcGlja2VyU3RvcmUsIFRpbWVwaWNrZXJBY3Rpb25zXSxcbiAgICB0ZW1wbGF0ZVVybDogJy4vdGltZXBpY2tlci5jb21wb25lbnQuaHRtbCcsXG4gICAgc3R5bGVzOiBbYFxuICAgIC5icy1jaGV2cm9uIHtcbiAgICAgIGJvcmRlci1zdHlsZTogc29saWQ7XG4gICAgICBkaXNwbGF5OiBibG9jaztcbiAgICAgIHdpZHRoOiA5cHg7XG4gICAgICBoZWlnaHQ6IDlweDtcbiAgICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgICAgIGJvcmRlci13aWR0aDogM3B4IDBweCAwIDNweDtcbiAgICB9XG5cbiAgICAuYnMtY2hldnJvbi11cCB7XG4gICAgICAtd2Via2l0LXRyYW5zZm9ybTogcm90YXRlKDQ1ZGVnKTtcbiAgICAgIHRyYW5zZm9ybTogcm90YXRlKDQ1ZGVnKTtcbiAgICAgIHRvcDogMnB4O1xuICAgIH1cblxuICAgIC5icy1jaGV2cm9uLWRvd24ge1xuICAgICAgLXdlYmtpdC10cmFuc2Zvcm06IHJvdGF0ZSgtMTM1ZGVnKTtcbiAgICAgIHRyYW5zZm9ybTogcm90YXRlKC0xMzVkZWcpO1xuICAgICAgdG9wOiAtMnB4O1xuICAgIH1cblxuICAgIC5icy10aW1lcGlja2VyLWZpZWxkIHtcbiAgICAgIHdpZHRoOiA2NXB4O1xuICAgICAgcGFkZGluZzogLjM3NXJlbSAuNTVyZW07XG4gICAgfVxuICBgXSxcbiAgICBlbmNhcHN1bGF0aW9uOiBWaWV3RW5jYXBzdWxhdGlvbi5Ob25lLFxuICAgIHN0YW5kYWxvbmU6IHRydWUsXG4gICAgaW1wb3J0czogW05nSWZdXG59KVxuZXhwb3J0IGNsYXNzIFRpbWVwaWNrZXJDb21wb25lbnRcbiAgaW1wbGVtZW50cyBDb250cm9sVmFsdWVBY2Nlc3NvcixcbiAgICBUaW1lcGlja2VyQ29tcG9uZW50U3RhdGUsXG4gICAgVGltZXBpY2tlckNvbnRyb2xzLFxuICAgIE9uQ2hhbmdlcyxcbiAgICBPbkRlc3Ryb3kge1xuICAvKiogaG91cnMgY2hhbmdlIHN0ZXAgKi9cbiAgQElucHV0KCkgaG91clN0ZXAgPSAxO1xuICAvKiogbWludXRlcyBjaGFuZ2Ugc3RlcCAqL1xuICBASW5wdXQoKSBtaW51dGVTdGVwID0gNTtcbiAgLyoqIHNlY29uZHMgY2hhbmdlIHN0ZXAgKi9cbiAgQElucHV0KCkgc2Vjb25kc1N0ZXAgPSAxMDtcbiAgLyoqIGlmIHRydWUgaG91cnMgYW5kIG1pbnV0ZXMgZmllbGRzIHdpbGwgYmUgcmVhZG9ubHkgKi9cbiAgQElucHV0KCkgcmVhZG9ubHlJbnB1dCA9IGZhbHNlO1xuICAvKiogaWYgdHJ1ZSBob3VycyBhbmQgbWludXRlcyBmaWVsZHMgd2lsbCBiZSBkaXNhYmxlZCAqL1xuICBASW5wdXQoKSBkaXNhYmxlZCA9IGZhbHNlO1xuICAvKiogaWYgdHJ1ZSBzY3JvbGwgaW5zaWRlIGhvdXJzIGFuZCBtaW51dGVzIGlucHV0cyB3aWxsIGNoYW5nZSB0aW1lICovXG4gIEBJbnB1dCgpIG1vdXNld2hlZWwgPSB0cnVlO1xuICAvKiogaWYgdHJ1ZSB0aGUgdmFsdWVzIG9mIGhvdXJzIGFuZCBtaW51dGVzIGNhbiBiZSBjaGFuZ2VkIHVzaW5nIHRoZSB1cC9kb3duIGFycm93IGtleXMgb24gdGhlIGtleWJvYXJkICovXG4gIEBJbnB1dCgpIGFycm93a2V5cyA9IHRydWU7XG4gIC8qKiBpZiB0cnVlIHNwaW5uZXIgYXJyb3dzIGFib3ZlIGFuZCBiZWxvdyB0aGUgaW5wdXRzIHdpbGwgYmUgc2hvd24gKi9cbiAgQElucHV0KCkgc2hvd1NwaW5uZXJzID0gdHJ1ZTtcbiAgLyoqIGlmIHRydWUgbWVyaWRpYW4gYnV0dG9uIHdpbGwgYmUgc2hvd24gKi9cbiAgQElucHV0KCkgc2hvd01lcmlkaWFuID0gdHJ1ZTtcbiAgLyoqIHNob3cgbWludXRlcyBpbiB0aW1lcGlja2VyICovXG4gIEBJbnB1dCgpIHNob3dNaW51dGVzID0gdHJ1ZTtcbiAgLyoqIHNob3cgc2Vjb25kcyBpbiB0aW1lcGlja2VyICovXG4gIEBJbnB1dCgpIHNob3dTZWNvbmRzID0gZmFsc2U7XG4gIC8qKiBtZXJpZGlhbiBsYWJlbHMgYmFzZWQgb24gbG9jYWxlICovXG4gIEBJbnB1dCgpIG1lcmlkaWFuczogc3RyaW5nW10gPSBbJ0FNJywgJ1BNJ107XG4gIC8qKiBtaW5pbXVtIHRpbWUgdXNlciBjYW4gc2VsZWN0ICovXG4gIEBJbnB1dCgpIG1pbj86IERhdGU7XG4gIC8qKiBtYXhpbXVtIHRpbWUgdXNlciBjYW4gc2VsZWN0ICovXG4gIEBJbnB1dCgpIG1heD86IERhdGU7XG4gIC8qKiBwbGFjZWhvbGRlciBmb3IgaG91cnMgZmllbGQgaW4gdGltZXBpY2tlciAqL1xuICBASW5wdXQoKSBob3Vyc1BsYWNlaG9sZGVyID0gJ0hIJztcbiAgLyoqIHBsYWNlaG9sZGVyIGZvciBtaW51dGVzIGZpZWxkIGluIHRpbWVwaWNrZXIgKi9cbiAgQElucHV0KCkgbWludXRlc1BsYWNlaG9sZGVyID0gJ01NJztcbiAgLyoqIHBsYWNlaG9sZGVyIGZvciBzZWNvbmRzIGZpZWxkIGluIHRpbWVwaWNrZXIgKi9cbiAgQElucHV0KCkgc2Vjb25kc1BsYWNlaG9sZGVyID0gJ1NTJztcbiAgLyoqIGVtaXRzIHRydWUgaWYgdmFsdWUgaXMgYSB2YWxpZCBkYXRlICovXG4gIEBPdXRwdXQoKSBpc1ZhbGlkID0gbmV3IEV2ZW50RW1pdHRlcjxib29sZWFuPigpO1xuICAvKiogZW1pdHMgdmFsdWUgb2YgbWVyaWRpYW4qL1xuICBAT3V0cHV0KCkgbWVyaWRpYW5DaGFuZ2UgPSBuZXcgRXZlbnRFbWl0dGVyPHN0cmluZz4oKTtcbiAgLy8gdWkgdmFyaWFibGVzXG4gIGhvdXJzID0gJyc7XG4gIG1pbnV0ZXMgPSAnJztcbiAgc2Vjb25kcyA9ICcnO1xuICBtZXJpZGlhbiA9ICcnO1xuICAvLyBtaW5cXG1heCB2YWxpZGF0aW9uIGZvciBpbnB1dCBmaWVsZHNcbiAgaW52YWxpZEhvdXJzID0gZmFsc2U7XG4gIGludmFsaWRNaW51dGVzID0gZmFsc2U7XG4gIGludmFsaWRTZWNvbmRzID0gZmFsc2U7XG4gIC8vIGFyaWEtbGFiZWwgdmFyaWFibGVzXG4gIGxhYmVsSG91cnMgPSAnaG91cnMnO1xuICBsYWJlbE1pbnV0ZXMgPSAnbWludXRlcyc7XG4gIGxhYmVsU2Vjb25kcyA9ICdzZWNvbmRzJztcbiAgLy8gdGltZSBwaWNrZXIgY29udHJvbHMgc3RhdGVcbiAgY2FuSW5jcmVtZW50SG91cnMgPSB0cnVlO1xuICBjYW5JbmNyZW1lbnRNaW51dGVzID0gdHJ1ZTtcbiAgY2FuSW5jcmVtZW50U2Vjb25kcyA9IHRydWU7XG4gIGNhbkRlY3JlbWVudEhvdXJzID0gdHJ1ZTtcbiAgY2FuRGVjcmVtZW50TWludXRlcyA9IHRydWU7XG4gIGNhbkRlY3JlbWVudFNlY29uZHMgPSB0cnVlO1xuICBjYW5Ub2dnbGVNZXJpZGlhbiA9IHRydWU7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gIG9uQ2hhbmdlID0gRnVuY3Rpb24ucHJvdG90eXBlO1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICBvblRvdWNoZWQgPSBGdW5jdGlvbi5wcm90b3R5cGU7XG5cbiAgY29uZmlnOiBUaW1lcGlja2VyQ29uZmlnO1xuXG4gIC8vIGNvbnRyb2wgdmFsdWUgYWNjZXNzb3IgbWV0aG9kc1xuICB0aW1lcGlja2VyU3ViPzogU3Vic2NyaXB0aW9uO1xuICBjb25zdHJ1Y3RvcihcbiAgICBfY29uZmlnOiBUaW1lcGlja2VyQ29uZmlnLFxuICAgIHByaXZhdGUgX2NkOiBDaGFuZ2VEZXRlY3RvclJlZixcbiAgICBwcml2YXRlIF9zdG9yZTogVGltZXBpY2tlclN0b3JlLFxuICAgIHByaXZhdGUgX3RpbWVwaWNrZXJBY3Rpb25zOiBUaW1lcGlja2VyQWN0aW9uc1xuICApIHtcbiAgICB0aGlzLmNvbmZpZyA9IF9jb25maWc7XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCB0aGlzLmNvbmZpZyk7XG4gICAgdGhpcy50aW1lcGlja2VyU3ViID0gX3N0b3JlLnNlbGVjdChzdGF0ZSA9PiBzdGF0ZS52YWx1ZSlcbiAgICAgIC5zdWJzY3JpYmUoKHZhbHVlOiBEYXRlIHwgdW5kZWZpbmVkKSA9PiB7XG4gICAgICAgIC8vIHVwZGF0ZSBVSSB2YWx1ZXMgaWYgZGF0ZSBjaGFuZ2VkXG4gICAgICAgIHRoaXMuX3JlbmRlclRpbWUodmFsdWUpO1xuICAgICAgICB0aGlzLm9uQ2hhbmdlKHZhbHVlKTtcblxuICAgICAgICB0aGlzLl9zdG9yZS5kaXNwYXRjaChcbiAgICAgICAgICB0aGlzLl90aW1lcGlja2VyQWN0aW9ucy51cGRhdGVDb250cm9scyhnZXRDb250cm9sc1ZhbHVlKHRoaXMpKVxuICAgICAgICApO1xuICAgICAgfSk7XG5cbiAgICBfc3RvcmUuc2VsZWN0KHN0YXRlID0+IHN0YXRlLmNvbnRyb2xzKVxuICAgICAgLnN1YnNjcmliZSgoY29udHJvbHNTdGF0ZTogVGltZXBpY2tlckNvbnRyb2xzKSA9PiB7XG4gICAgICAgIGNvbnN0IGlzVGltZXBpY2tlcklucHV0VmFsaWQgPSBpc0lucHV0VmFsaWQodGhpcy5ob3VycywgdGhpcy5taW51dGVzLCB0aGlzLnNlY29uZHMsIHRoaXMuaXNQTSgpKTtcbiAgICAgICAgY29uc3QgaXNWYWxpZCA9IHRoaXMuY29uZmlnLmFsbG93RW1wdHlUaW1lP1xuICAgICAgICAgIHRoaXMuaXNPbmVPZkRhdGVzSXNFbXB0eSgpIHx8IGlzVGltZXBpY2tlcklucHV0VmFsaWRcbiAgICAgICAgICA6IGlzVGltZXBpY2tlcklucHV0VmFsaWQ7XG4gICAgICAgIHRoaXMuaXNWYWxpZC5lbWl0KGlzVmFsaWQpO1xuICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMsIGNvbnRyb2xzU3RhdGUpO1xuICAgICAgICBfY2QubWFya0ZvckNoZWNrKCk7XG4gICAgICB9KTtcbiAgfVxuXG4gIC8qKiBAZGVwcmVjYXRlZCAtIHBsZWFzZSB1c2UgYGlzRWRpdGFibGVgIGluc3RlYWQgKi9cbiAgZ2V0IGlzU3Bpbm5lcnNWaXNpYmxlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnNob3dTcGlubmVycyAmJiAhdGhpcy5yZWFkb25seUlucHV0O1xuICB9XG5cbiAgZ2V0IGlzRWRpdGFibGUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEodGhpcy5yZWFkb25seUlucHV0IHx8IHRoaXMuZGlzYWJsZWQpO1xuICB9XG5cbiAgcmVzZXRWYWxpZGF0aW9uKCk6IHZvaWQge1xuICAgIHRoaXMuaW52YWxpZEhvdXJzID0gZmFsc2U7XG4gICAgdGhpcy5pbnZhbGlkTWludXRlcyA9IGZhbHNlO1xuICAgIHRoaXMuaW52YWxpZFNlY29uZHMgPSBmYWxzZTtcbiAgfVxuXG4gIGlzUE0oKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc2hvd01lcmlkaWFuICYmIHRoaXMubWVyaWRpYW4gPT09IHRoaXMubWVyaWRpYW5zWzFdO1xuICB9XG5cbiAgcHJldkRlZigkZXZlbnQ6IEV2ZW50KSB7XG4gICAgJGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gIH1cblxuICB3aGVlbFNpZ24oJGV2ZW50OiBXaGVlbEV2ZW50SW5pdCk6IG51bWJlciB7XG4gICAgcmV0dXJuIE1hdGguc2lnbigkZXZlbnQuZGVsdGFZIHx8IDApICogLTE7XG4gIH1cblxuICBuZ09uQ2hhbmdlcygpOiB2b2lkIHtcbiAgICB0aGlzLl9zdG9yZS5kaXNwYXRjaChcbiAgICAgIHRoaXMuX3RpbWVwaWNrZXJBY3Rpb25zLnVwZGF0ZUNvbnRyb2xzKGdldENvbnRyb2xzVmFsdWUodGhpcykpXG4gICAgKTtcbiAgfVxuXG4gIGNoYW5nZUhvdXJzKHN0ZXA6IG51bWJlciwgc291cmNlOiBUaW1lQ2hhbmdlU291cmNlID0gJycpOiB2b2lkIHtcbiAgICB0aGlzLnJlc2V0VmFsaWRhdGlvbigpO1xuICAgIHRoaXMuX3N0b3JlLmRpc3BhdGNoKHRoaXMuX3RpbWVwaWNrZXJBY3Rpb25zLmNoYW5nZUhvdXJzKHsgc3RlcCwgc291cmNlIH0pKTtcbiAgfVxuXG4gIGNoYW5nZU1pbnV0ZXMoc3RlcDogbnVtYmVyLCBzb3VyY2U6IFRpbWVDaGFuZ2VTb3VyY2UgPSAnJyk6IHZvaWQge1xuICAgIHRoaXMucmVzZXRWYWxpZGF0aW9uKCk7XG4gICAgdGhpcy5fc3RvcmUuZGlzcGF0Y2goXG4gICAgICB0aGlzLl90aW1lcGlja2VyQWN0aW9ucy5jaGFuZ2VNaW51dGVzKHsgc3RlcCwgc291cmNlIH0pXG4gICAgKTtcbiAgfVxuXG4gIGNoYW5nZVNlY29uZHMoc3RlcDogbnVtYmVyLCBzb3VyY2U6IFRpbWVDaGFuZ2VTb3VyY2UgPSAnJyk6IHZvaWQge1xuICAgIHRoaXMucmVzZXRWYWxpZGF0aW9uKCk7XG4gICAgdGhpcy5fc3RvcmUuZGlzcGF0Y2goXG4gICAgICB0aGlzLl90aW1lcGlja2VyQWN0aW9ucy5jaGFuZ2VTZWNvbmRzKHsgc3RlcCwgc291cmNlIH0pXG4gICAgKTtcbiAgfVxuXG4gIHVwZGF0ZUhvdXJzKHRhcmdldD86IFBhcnRpYWw8RXZlbnRUYXJnZXQ+IHwgbnVsbCk6IHZvaWQge1xuICAgIHRoaXMucmVzZXRWYWxpZGF0aW9uKCk7XG4gICAgdGhpcy5ob3VycyA9ICh0YXJnZXQgYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWU7XG5cbiAgICBjb25zdCBpc1RpbWVwaWNrZXJJbnB1dFZhbGlkID0gaXNIb3VySW5wdXRWYWxpZCh0aGlzLmhvdXJzLCB0aGlzLmlzUE0oKSkgJiYgdGhpcy5pc1ZhbGlkTGltaXQoKTtcbiAgICBjb25zdCBpc1ZhbGlkID0gdGhpcy5jb25maWcuYWxsb3dFbXB0eVRpbWUgP1xuICAgICAgdGhpcy5pc09uZU9mRGF0ZXNJc0VtcHR5KCkgfHwgaXNUaW1lcGlja2VySW5wdXRWYWxpZFxuICAgICAgOiBpc1RpbWVwaWNrZXJJbnB1dFZhbGlkO1xuXG4gICAgaWYgKCFpc1ZhbGlkKSB7XG4gICAgICB0aGlzLmludmFsaWRIb3VycyA9IHRydWU7XG4gICAgICB0aGlzLmlzVmFsaWQuZW1pdChmYWxzZSk7XG4gICAgICB0aGlzLm9uQ2hhbmdlKG51bGwpO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5fdXBkYXRlVGltZSgpO1xuICB9XG5cbiAgdXBkYXRlTWludXRlcyh0YXJnZXQ6IFBhcnRpYWw8RXZlbnRUYXJnZXQ+IHwgbnVsbCkge1xuICAgIHRoaXMucmVzZXRWYWxpZGF0aW9uKCk7XG4gICAgdGhpcy5taW51dGVzID0gKHRhcmdldCBhcyBIVE1MSW5wdXRFbGVtZW50KS52YWx1ZTtcblxuICAgIGNvbnN0IGlzVGltZXBpY2tlcklucHV0VmFsaWQgPSBpc01pbnV0ZUlucHV0VmFsaWQodGhpcy5taW51dGVzKSAmJiB0aGlzLmlzVmFsaWRMaW1pdCgpO1xuICAgIGNvbnN0IGlzVmFsaWQgPSB0aGlzLmNvbmZpZy5hbGxvd0VtcHR5VGltZSA/XG4gICAgICB0aGlzLmlzT25lT2ZEYXRlc0lzRW1wdHkoKSB8fCBpc1RpbWVwaWNrZXJJbnB1dFZhbGlkXG4gICAgICA6IGlzVGltZXBpY2tlcklucHV0VmFsaWQ7XG5cbiAgICBpZiAoIWlzVmFsaWQpIHtcbiAgICAgIHRoaXMuaW52YWxpZE1pbnV0ZXMgPSB0cnVlO1xuICAgICAgdGhpcy5pc1ZhbGlkLmVtaXQoZmFsc2UpO1xuICAgICAgdGhpcy5vbkNoYW5nZShudWxsKTtcblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuX3VwZGF0ZVRpbWUoKTtcbiAgfVxuXG4gIHVwZGF0ZVNlY29uZHModGFyZ2V0OiBQYXJ0aWFsPEV2ZW50VGFyZ2V0PiB8IG51bGwpIHtcbiAgICB0aGlzLnJlc2V0VmFsaWRhdGlvbigpO1xuICAgIHRoaXMuc2Vjb25kcyA9ICh0YXJnZXQgYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWU7XG5cbiAgICBjb25zdCBpc1RpbWVwaWNrZXJJbnB1dFZhbGlkID0gaXNTZWNvbmRJbnB1dFZhbGlkKHRoaXMuc2Vjb25kcykgJiYgdGhpcy5pc1ZhbGlkTGltaXQoKTtcbiAgICBjb25zdCBpc1ZhbGlkID0gdGhpcy5jb25maWcuYWxsb3dFbXB0eVRpbWUgP1xuICAgICAgdGhpcy5pc09uZU9mRGF0ZXNJc0VtcHR5KCkgfHwgaXNUaW1lcGlja2VySW5wdXRWYWxpZFxuICAgICAgOiBpc1RpbWVwaWNrZXJJbnB1dFZhbGlkO1xuXG4gICAgaWYgKCFpc1ZhbGlkKSB7XG4gICAgICB0aGlzLmludmFsaWRTZWNvbmRzID0gdHJ1ZTtcbiAgICAgIHRoaXMuaXNWYWxpZC5lbWl0KGZhbHNlKTtcbiAgICAgIHRoaXMub25DaGFuZ2UobnVsbCk7XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLl91cGRhdGVUaW1lKCk7XG4gIH1cblxuICBpc1ZhbGlkTGltaXQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGlzSW5wdXRMaW1pdFZhbGlkKHtcbiAgICAgIGhvdXI6IHRoaXMuaG91cnMsXG4gICAgICBtaW51dGU6IHRoaXMubWludXRlcyxcbiAgICAgIHNlY29uZHM6IHRoaXMuc2Vjb25kcyxcbiAgICAgIGlzUE06IHRoaXMuaXNQTSgpXG4gICAgfSwgdGhpcy5tYXgsIHRoaXMubWluKTtcbiAgfVxuXG4gIGlzT25lT2ZEYXRlc0lzRW1wdHkoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGlzT25lT2ZEYXRlc0VtcHR5KFxuICAgICAgdGhpcy5ob3VycyxcbiAgICAgIHRoaXMubWludXRlcyxcbiAgICAgIHRoaXMuc2Vjb25kcyk7XG4gIH1cblxuICBfdXBkYXRlVGltZSgpIHtcbiAgICBjb25zdCBfc2Vjb25kcyA9IHRoaXMuc2hvd1NlY29uZHMgPyB0aGlzLnNlY29uZHMgOiB2b2lkIDA7XG4gICAgY29uc3QgX21pbnV0ZXMgPSB0aGlzLnNob3dNaW51dGVzID8gdGhpcy5taW51dGVzIDogdm9pZCAwO1xuICAgIGNvbnN0IGlzVGltZXBpY2tlcklucHV0VmFsaWQgPSBpc0lucHV0VmFsaWQodGhpcy5ob3VycywgX21pbnV0ZXMsIF9zZWNvbmRzLCB0aGlzLmlzUE0oKSk7XG4gICAgY29uc3QgaXNWYWxpZCA9IHRoaXMuY29uZmlnLmFsbG93RW1wdHlUaW1lID9cbiAgICAgIHRoaXMuaXNPbmVPZkRhdGVzSXNFbXB0eSgpIHx8IGlzVGltZXBpY2tlcklucHV0VmFsaWRcbiAgICAgIDogaXNUaW1lcGlja2VySW5wdXRWYWxpZDtcbiAgICBpZiAoIWlzVmFsaWQpIHtcbiAgICAgIHRoaXMuaXNWYWxpZC5lbWl0KGZhbHNlKTtcbiAgICAgIHRoaXMub25DaGFuZ2UobnVsbCk7XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLl9zdG9yZS5kaXNwYXRjaChcbiAgICAgIHRoaXMuX3RpbWVwaWNrZXJBY3Rpb25zLnNldFRpbWUoe1xuICAgICAgICBob3VyOiB0aGlzLmhvdXJzLFxuICAgICAgICBtaW51dGU6IHRoaXMubWludXRlcyxcbiAgICAgICAgc2Vjb25kczogdGhpcy5zZWNvbmRzLFxuICAgICAgICBpc1BNOiB0aGlzLmlzUE0oKVxuICAgICAgfSlcbiAgICApO1xuICB9XG5cbiAgdG9nZ2xlTWVyaWRpYW4oKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLnNob3dNZXJpZGlhbiB8fCAhdGhpcy5pc0VkaXRhYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgX2hvdXJzUGVyRGF5SGFsZiA9IDEyO1xuICAgIHRoaXMuX3N0b3JlLmRpc3BhdGNoKFxuICAgICAgdGhpcy5fdGltZXBpY2tlckFjdGlvbnMuY2hhbmdlSG91cnMoe1xuICAgICAgICBzdGVwOiBfaG91cnNQZXJEYXlIYWxmLFxuICAgICAgICBzb3VyY2U6ICcnXG4gICAgICB9KVxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogV3JpdGUgYSBuZXcgdmFsdWUgdG8gdGhlIGVsZW1lbnQuXG4gICAqL1xuICB3cml0ZVZhbHVlKG9iaj86IHN0cmluZyB8IERhdGUpOiB2b2lkIHtcbiAgICBpZiAoaXNWYWxpZERhdGUob2JqKSkge1xuICAgICAgdGhpcy5yZXNldFZhbGlkYXRpb24oKTtcbiAgICAgIHRoaXMuX3N0b3JlLmRpc3BhdGNoKHRoaXMuX3RpbWVwaWNrZXJBY3Rpb25zLndyaXRlVmFsdWUocGFyc2VUaW1lKG9iaikpKTtcbiAgICB9IGVsc2UgaWYgKG9iaiA9PSBudWxsKSB7XG4gICAgICB0aGlzLl9zdG9yZS5kaXNwYXRjaCh0aGlzLl90aW1lcGlja2VyQWN0aW9ucy53cml0ZVZhbHVlKCkpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgdGhlIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBjb250cm9sIHJlY2VpdmVzIGEgY2hhbmdlIGV2ZW50LlxuICAgKi9cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgcmVnaXN0ZXJPbkNoYW5nZShmbjogKF86IGFueSkgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMub25DaGFuZ2UgPSBmbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgdGhlIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBjb250cm9sIHJlY2VpdmVzIGEgdG91Y2ggZXZlbnQuXG4gICAqL1xuICByZWdpc3Rlck9uVG91Y2hlZChmbjogKCkgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMub25Ub3VjaGVkID0gZm47XG4gIH1cblxuICAvKipcbiAgICogVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgd2hlbiB0aGUgY29udHJvbCBzdGF0dXMgY2hhbmdlcyB0byBvciBmcm9tIFwiZGlzYWJsZWRcIi5cbiAgICogRGVwZW5kaW5nIG9uIHRoZSB2YWx1ZSwgaXQgd2lsbCBlbmFibGUgb3IgZGlzYWJsZSB0aGUgYXBwcm9wcmlhdGUgRE9NIGVsZW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSBpc0Rpc2FibGVkXG4gICAqL1xuICBzZXREaXNhYmxlZFN0YXRlKGlzRGlzYWJsZWQ6IGJvb2xlYW4pOiB2b2lkIHtcbiAgICB0aGlzLmRpc2FibGVkID0gaXNEaXNhYmxlZDtcbiAgICB0aGlzLl9jZC5tYXJrRm9yQ2hlY2soKTtcbiAgfVxuXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMudGltZXBpY2tlclN1Yj8udW5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIHByaXZhdGUgX3JlbmRlclRpbWUodmFsdWU/OiBzdHJpbmcgfCBEYXRlKTogdm9pZCB7XG4gICAgaWYgKCF2YWx1ZSB8fCAhaXNWYWxpZERhdGUodmFsdWUpKSB7XG4gICAgICB0aGlzLmhvdXJzID0gJyc7XG4gICAgICB0aGlzLm1pbnV0ZXMgPSAnJztcbiAgICAgIHRoaXMuc2Vjb25kcyA9ICcnO1xuICAgICAgdGhpcy5tZXJpZGlhbiA9IHRoaXMubWVyaWRpYW5zWzBdO1xuICAgICAgdGhpcy5tZXJpZGlhbkNoYW5nZS5lbWl0KHRoaXMubWVyaWRpYW4pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IF92YWx1ZSA9IHBhcnNlVGltZSh2YWx1ZSk7XG4gICAgaWYgKCFfdmFsdWUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBfaG91cnNQZXJEYXlIYWxmID0gMTI7XG4gICAgbGV0IF9ob3VycyA9IF92YWx1ZS5nZXRIb3VycygpO1xuXG4gICAgaWYgKHRoaXMuc2hvd01lcmlkaWFuKSB7XG4gICAgICB0aGlzLm1lcmlkaWFuID0gdGhpcy5tZXJpZGlhbnNbX2hvdXJzID49IF9ob3Vyc1BlckRheUhhbGYgPyAxIDogMF07XG4gICAgICB0aGlzLm1lcmlkaWFuQ2hhbmdlLmVtaXQodGhpcy5tZXJpZGlhbik7XG4gICAgICBfaG91cnMgPSBfaG91cnMgJSBfaG91cnNQZXJEYXlIYWxmO1xuICAgICAgLy8gc2hvdWxkIGJlIDEyIFBNLCBub3QgMDAgUE1cbiAgICAgIGlmIChfaG91cnMgPT09IDApIHtcbiAgICAgICAgX2hvdXJzID0gX2hvdXJzUGVyRGF5SGFsZjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmhvdXJzID0gcGFkTnVtYmVyKF9ob3Vycyk7XG4gICAgdGhpcy5taW51dGVzID0gcGFkTnVtYmVyKF92YWx1ZS5nZXRNaW51dGVzKCkpO1xuICAgIHRoaXMuc2Vjb25kcyA9IHBhZE51bWJlcihfdmFsdWUuZ2V0VVRDU2Vjb25kcygpKTtcbiAgfVxufVxuIiwiPHRhYmxlPlxuICA8dGJvZHk+XG4gIDx0ciBjbGFzcz1cInRleHQtY2VudGVyXCIgW2hpZGRlbl09XCIhc2hvd1NwaW5uZXJzXCI+XG4gICAgPCEtLSBpbmNyZW1lbnQgaG91cnMgYnV0dG9uLS0+XG4gICAgPHRkPlxuICAgICAgPGEgY2xhc3M9XCJidG4gYnRuLWxpbmtcIiBbY2xhc3MuZGlzYWJsZWRdPVwiIWNhbkluY3JlbWVudEhvdXJzIHx8ICFpc0VkaXRhYmxlXCJcbiAgICAgICAgIChjbGljayk9XCJjaGFuZ2VIb3Vycyhob3VyU3RlcClcIlxuICAgICAgICAgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKTtcIlxuICAgICAgPjxzcGFuIGNsYXNzPVwiYnMtY2hldnJvbiBicy1jaGV2cm9uLXVwXCI+PC9zcGFuPjwvYT5cbiAgICA8L3RkPlxuICAgIDwhLS0gZGl2aWRlciAtLT5cbiAgICA8dGQgKm5nSWY9XCJzaG93TWludXRlc1wiPiZuYnNwOyZuYnNwOyZuYnNwOzwvdGQ+XG4gICAgPCEtLSBpbmNyZW1lbnQgbWludXRlcyBidXR0b24gLS0+XG4gICAgPHRkICpuZ0lmPVwic2hvd01pbnV0ZXNcIj5cbiAgICAgIDxhIGNsYXNzPVwiYnRuIGJ0bi1saW5rXCIgW2NsYXNzLmRpc2FibGVkXT1cIiFjYW5JbmNyZW1lbnRNaW51dGVzIHx8ICFpc0VkaXRhYmxlXCJcbiAgICAgICAgIChjbGljayk9XCJjaGFuZ2VNaW51dGVzKG1pbnV0ZVN0ZXApXCJcbiAgICAgICAgIGhyZWY9XCJqYXZhc2NyaXB0OnZvaWQoMCk7XCJcbiAgICAgID48c3BhbiBjbGFzcz1cImJzLWNoZXZyb24gYnMtY2hldnJvbi11cFwiPjwvc3Bhbj48L2E+XG4gICAgPC90ZD5cbiAgICA8IS0tIGRpdmlkZXIgLS0+XG4gICAgPHRkICpuZ0lmPVwic2hvd1NlY29uZHNcIj4mbmJzcDs8L3RkPlxuICAgIDwhLS0gaW5jcmVtZW50IHNlY29uZHMgYnV0dG9uIC0tPlxuICAgIDx0ZCAqbmdJZj1cInNob3dTZWNvbmRzXCI+XG4gICAgICA8YSBjbGFzcz1cImJ0biBidG4tbGlua1wiIFtjbGFzcy5kaXNhYmxlZF09XCIhY2FuSW5jcmVtZW50U2Vjb25kcyB8fCAhaXNFZGl0YWJsZVwiXG4gICAgICAgICAoY2xpY2spPVwiY2hhbmdlU2Vjb25kcyhzZWNvbmRzU3RlcClcIlxuICAgICAgICAgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKTtcIlxuICAgICAgPlxuICAgICAgICA8c3BhbiBjbGFzcz1cImJzLWNoZXZyb24gYnMtY2hldnJvbi11cFwiPjwvc3Bhbj5cbiAgICAgIDwvYT5cbiAgICA8L3RkPlxuICAgIDwhLS0gc3BhY2UgYmV0d2VlbiAtLT5cbiAgICA8dGQgKm5nSWY9XCJzaG93TWVyaWRpYW5cIj4mbmJzcDsmbmJzcDsmbmJzcDs8L3RkPlxuICAgIDwhLS0gbWVyaWRpYW4gcGxhY2Vob2xkZXItLT5cbiAgICA8dGQgKm5nSWY9XCJzaG93TWVyaWRpYW5cIj48L3RkPlxuICA8L3RyPlxuICA8dHI+XG4gICAgPCEtLSBob3VycyAtLT5cbiAgICA8dGQgY2xhc3M9XCJmb3JtLWdyb3VwIG1iLTNcIiBbY2xhc3MuaGFzLWVycm9yXT1cImludmFsaWRIb3Vyc1wiPlxuICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgW2NsYXNzLmlzLWludmFsaWRdPVwiaW52YWxpZEhvdXJzXCJcbiAgICAgICAgICAgICBjbGFzcz1cImZvcm0tY29udHJvbCB0ZXh0LWNlbnRlciBicy10aW1lcGlja2VyLWZpZWxkXCJcbiAgICAgICAgICAgICBbcGxhY2Vob2xkZXJdPVwiaG91cnNQbGFjZWhvbGRlclwiXG4gICAgICAgICAgICAgbWF4bGVuZ3RoPVwiMlwiXG4gICAgICAgICAgICAgW3JlYWRvbmx5XT1cInJlYWRvbmx5SW5wdXRcIlxuICAgICAgICAgICAgIFtkaXNhYmxlZF09XCJkaXNhYmxlZFwiXG4gICAgICAgICAgICAgW3ZhbHVlXT1cImhvdXJzXCJcbiAgICAgICAgICAgICAod2hlZWwpPVwicHJldkRlZigkZXZlbnQpO2NoYW5nZUhvdXJzKGhvdXJTdGVwICogd2hlZWxTaWduKCRldmVudCksICd3aGVlbCcpXCJcbiAgICAgICAgICAgICAoa2V5ZG93bi5BcnJvd1VwKT1cImNoYW5nZUhvdXJzKGhvdXJTdGVwLCAna2V5JylcIlxuICAgICAgICAgICAgIChrZXlkb3duLkFycm93RG93bik9XCJjaGFuZ2VIb3VycygtaG91clN0ZXAsICdrZXknKVwiXG4gICAgICAgICAgICAgKGNoYW5nZSk9XCJ1cGRhdGVIb3VycygkZXZlbnQudGFyZ2V0KVwiIFthdHRyLmFyaWEtbGFiZWxdPVwibGFiZWxIb3Vyc1wiPjwvdGQ+XG4gICAgPCEtLSBkaXZpZGVyIC0tPlxuICAgIDx0ZCAqbmdJZj1cInNob3dNaW51dGVzXCI+Jm5ic3A7OiZuYnNwOzwvdGQ+XG4gICAgPCEtLSBtaW51dGVzIC0tPlxuICAgIDx0ZCBjbGFzcz1cImZvcm0tZ3JvdXAgbWItM1wiICpuZ0lmPVwic2hvd01pbnV0ZXNcIiBbY2xhc3MuaGFzLWVycm9yXT1cImludmFsaWRNaW51dGVzXCI+XG4gICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBbY2xhc3MuaXMtaW52YWxpZF09XCJpbnZhbGlkTWludXRlc1wiXG4gICAgICAgICAgICAgY2xhc3M9XCJmb3JtLWNvbnRyb2wgdGV4dC1jZW50ZXIgYnMtdGltZXBpY2tlci1maWVsZFwiXG4gICAgICAgICAgICAgW3BsYWNlaG9sZGVyXT1cIm1pbnV0ZXNQbGFjZWhvbGRlclwiXG4gICAgICAgICAgICAgbWF4bGVuZ3RoPVwiMlwiXG4gICAgICAgICAgICAgW3JlYWRvbmx5XT1cInJlYWRvbmx5SW5wdXRcIlxuICAgICAgICAgICAgIFtkaXNhYmxlZF09XCJkaXNhYmxlZFwiXG4gICAgICAgICAgICAgW3ZhbHVlXT1cIm1pbnV0ZXNcIlxuICAgICAgICAgICAgICh3aGVlbCk9XCJwcmV2RGVmKCRldmVudCk7Y2hhbmdlTWludXRlcyhtaW51dGVTdGVwICogd2hlZWxTaWduKCRldmVudCksICd3aGVlbCcpXCJcbiAgICAgICAgICAgICAoa2V5ZG93bi5BcnJvd1VwKT1cImNoYW5nZU1pbnV0ZXMobWludXRlU3RlcCwgJ2tleScpXCJcbiAgICAgICAgICAgICAoa2V5ZG93bi5BcnJvd0Rvd24pPVwiY2hhbmdlTWludXRlcygtbWludXRlU3RlcCwgJ2tleScpXCJcbiAgICAgICAgICAgICAoY2hhbmdlKT1cInVwZGF0ZU1pbnV0ZXMoJGV2ZW50LnRhcmdldClcIiBbYXR0ci5hcmlhLWxhYmVsXT1cImxhYmVsTWludXRlc1wiPlxuICAgIDwvdGQ+XG4gICAgPCEtLSBkaXZpZGVyIC0tPlxuICAgIDx0ZCAqbmdJZj1cInNob3dTZWNvbmRzXCI+Jm5ic3A7OiZuYnNwOzwvdGQ+XG4gICAgPCEtLSBzZWNvbmRzIC0tPlxuICAgIDx0ZCBjbGFzcz1cImZvcm0tZ3JvdXAgbWItM1wiICpuZ0lmPVwic2hvd1NlY29uZHNcIiBbY2xhc3MuaGFzLWVycm9yXT1cImludmFsaWRTZWNvbmRzXCI+XG4gICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBbY2xhc3MuaXMtaW52YWxpZF09XCJpbnZhbGlkU2Vjb25kc1wiXG4gICAgICAgICAgICAgY2xhc3M9XCJmb3JtLWNvbnRyb2wgdGV4dC1jZW50ZXIgYnMtdGltZXBpY2tlci1maWVsZFwiXG4gICAgICAgICAgICAgW3BsYWNlaG9sZGVyXT1cInNlY29uZHNQbGFjZWhvbGRlclwiXG4gICAgICAgICAgICAgbWF4bGVuZ3RoPVwiMlwiXG4gICAgICAgICAgICAgW3JlYWRvbmx5XT1cInJlYWRvbmx5SW5wdXRcIlxuICAgICAgICAgICAgIFtkaXNhYmxlZF09XCJkaXNhYmxlZFwiXG4gICAgICAgICAgICAgW3ZhbHVlXT1cInNlY29uZHNcIlxuICAgICAgICAgICAgICh3aGVlbCk9XCJwcmV2RGVmKCRldmVudCk7Y2hhbmdlU2Vjb25kcyhzZWNvbmRzU3RlcCAqIHdoZWVsU2lnbigkZXZlbnQpLCAnd2hlZWwnKVwiXG4gICAgICAgICAgICAgKGtleWRvd24uQXJyb3dVcCk9XCJjaGFuZ2VTZWNvbmRzKHNlY29uZHNTdGVwLCAna2V5JylcIlxuICAgICAgICAgICAgIChrZXlkb3duLkFycm93RG93bik9XCJjaGFuZ2VTZWNvbmRzKC1zZWNvbmRzU3RlcCwgJ2tleScpXCJcbiAgICAgICAgICAgICAoY2hhbmdlKT1cInVwZGF0ZVNlY29uZHMoJGV2ZW50LnRhcmdldClcIiBbYXR0ci5hcmlhLWxhYmVsXT1cImxhYmVsU2Vjb25kc1wiPlxuICAgIDwvdGQ+XG4gICAgPCEtLSBzcGFjZSBiZXR3ZWVuIC0tPlxuICAgIDx0ZCAqbmdJZj1cInNob3dNZXJpZGlhblwiPiZuYnNwOyZuYnNwOyZuYnNwOzwvdGQ+XG4gICAgPCEtLSBtZXJpZGlhbiAtLT5cbiAgICA8dGQgKm5nSWY9XCJzaG93TWVyaWRpYW5cIj5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiYnRuIGJ0bi1kZWZhdWx0IHRleHQtY2VudGVyXCJcbiAgICAgICAgICAgICAgW2Rpc2FibGVkXT1cIiFpc0VkaXRhYmxlIHx8ICFjYW5Ub2dnbGVNZXJpZGlhblwiXG4gICAgICAgICAgICAgIFtjbGFzcy5kaXNhYmxlZF09XCIhaXNFZGl0YWJsZSB8fCAhY2FuVG9nZ2xlTWVyaWRpYW5cIlxuICAgICAgICAgICAgICAoY2xpY2spPVwidG9nZ2xlTWVyaWRpYW4oKVwiXG4gICAgICA+e3sgbWVyaWRpYW4gfX1cbiAgICAgIDwvYnV0dG9uPlxuICAgIDwvdGQ+XG4gIDwvdHI+XG4gIDx0ciBjbGFzcz1cInRleHQtY2VudGVyXCIgW2hpZGRlbl09XCIhc2hvd1NwaW5uZXJzXCI+XG4gICAgPCEtLSBkZWNyZW1lbnQgaG91cnMgYnV0dG9uLS0+XG4gICAgPHRkPlxuICAgICAgPGEgY2xhc3M9XCJidG4gYnRuLWxpbmtcIiBbY2xhc3MuZGlzYWJsZWRdPVwiIWNhbkRlY3JlbWVudEhvdXJzIHx8ICFpc0VkaXRhYmxlXCJcbiAgICAgICAgIChjbGljayk9XCJjaGFuZ2VIb3VycygtaG91clN0ZXApXCJcbiAgICAgICAgIGhyZWY9XCJqYXZhc2NyaXB0OnZvaWQoMCk7XCJcbiAgICAgID5cbiAgICAgICAgPHNwYW4gY2xhc3M9XCJicy1jaGV2cm9uIGJzLWNoZXZyb24tZG93blwiPjwvc3Bhbj5cbiAgICAgIDwvYT5cbiAgICA8L3RkPlxuICAgIDwhLS0gZGl2aWRlciAtLT5cbiAgICA8dGQgKm5nSWY9XCJzaG93TWludXRlc1wiPiZuYnNwOyZuYnNwOyZuYnNwOzwvdGQ+XG4gICAgPCEtLSBkZWNyZW1lbnQgbWludXRlcyBidXR0b24tLT5cbiAgICA8dGQgKm5nSWY9XCJzaG93TWludXRlc1wiPlxuICAgICAgPGEgY2xhc3M9XCJidG4gYnRuLWxpbmtcIiBbY2xhc3MuZGlzYWJsZWRdPVwiIWNhbkRlY3JlbWVudE1pbnV0ZXMgfHwgIWlzRWRpdGFibGVcIlxuICAgICAgICAgKGNsaWNrKT1cImNoYW5nZU1pbnV0ZXMoLW1pbnV0ZVN0ZXApXCJcbiAgICAgICAgIGhyZWY9XCJqYXZhc2NyaXB0OnZvaWQoMCk7XCJcbiAgICAgID5cbiAgICAgICAgPHNwYW4gY2xhc3M9XCJicy1jaGV2cm9uIGJzLWNoZXZyb24tZG93blwiPjwvc3Bhbj5cbiAgICAgIDwvYT5cbiAgICA8L3RkPlxuICAgIDwhLS0gZGl2aWRlciAtLT5cbiAgICA8dGQgKm5nSWY9XCJzaG93U2Vjb25kc1wiPiZuYnNwOzwvdGQ+XG4gICAgPCEtLSBkZWNyZW1lbnQgc2Vjb25kcyBidXR0b24tLT5cbiAgICA8dGQgKm5nSWY9XCJzaG93U2Vjb25kc1wiPlxuICAgICAgPGEgY2xhc3M9XCJidG4gYnRuLWxpbmtcIiBbY2xhc3MuZGlzYWJsZWRdPVwiIWNhbkRlY3JlbWVudFNlY29uZHMgfHwgIWlzRWRpdGFibGVcIlxuICAgICAgICAgKGNsaWNrKT1cImNoYW5nZVNlY29uZHMoLXNlY29uZHNTdGVwKVwiXG4gICAgICAgICBocmVmPVwiamF2YXNjcmlwdDp2b2lkKDApO1wiXG4gICAgICA+XG4gICAgICAgIDxzcGFuIGNsYXNzPVwiYnMtY2hldnJvbiBicy1jaGV2cm9uLWRvd25cIj48L3NwYW4+XG4gICAgICA8L2E+XG4gICAgPC90ZD5cbiAgICA8IS0tIHNwYWNlIGJldHdlZW4gLS0+XG4gICAgPHRkICpuZ0lmPVwic2hvd01lcmlkaWFuXCI+Jm5ic3A7Jm5ic3A7Jm5ic3A7PC90ZD5cbiAgICA8IS0tIG1lcmlkaWFuIHBsYWNlaG9sZGVyLS0+XG4gICAgPHRkICpuZ0lmPVwic2hvd01lcmlkaWFuXCI+PC90ZD5cbiAgPC90cj5cbiAgPC90Ym9keT5cbjwvdGFibGU+XG4iXX0=