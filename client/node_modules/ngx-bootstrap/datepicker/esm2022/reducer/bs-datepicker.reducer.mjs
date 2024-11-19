import { initialDatepickerState } from './bs-datepicker.state';
import { BsDatepickerActions } from './bs-datepicker.actions';
import { calcDaysCalendar } from '../engine/calc-days-calendar';
import { formatDaysCalendar } from '../engine/format-days-calendar';
import { flagDaysCalendar } from '../engine/flag-days-calendar';
import { setFullDate, shiftDate, isArray, isDateValid, startOf, getLocale, isAfter, isBefore, isSame } from 'ngx-bootstrap/chronos';
import { canSwitchMode } from '../engine/view-mode';
import { formatMonthsCalendar } from '../engine/format-months-calendar';
import { flagMonthsCalendar } from '../engine/flag-months-calendar';
import { formatYearsCalendar, initialYearShift, yearsPerCalendar } from '../engine/format-years-calendar';
import { flagYearsCalendar } from '../engine/flag-years-calendar';
import { getYearsCalendarInitialDate } from '../utils/bs-calendar-utils';
import { copyTime } from '../utils/copy-time-utils';
export function bsDatepickerReducer(state = initialDatepickerState, action) {
    switch (action.type) {
        case BsDatepickerActions.CALCULATE: {
            return calculateReducer(state);
        }
        case BsDatepickerActions.FORMAT: {
            return formatReducer(state);
        }
        case BsDatepickerActions.FLAG: {
            return flagReducer(state);
        }
        case BsDatepickerActions.NAVIGATE_OFFSET: {
            return navigateOffsetReducer(state, action);
        }
        case BsDatepickerActions.NAVIGATE_TO: {
            const payload = action.payload;
            if (!state.view || !payload.unit) {
                return state;
            }
            const date = setFullDate(state.view.date, payload.unit);
            let newState;
            let mode;
            if (canSwitchMode(payload.viewMode, state.minMode)) {
                mode = payload.viewMode;
                newState = { view: { date, mode } };
            }
            else {
                mode = state.view.mode;
                newState = { selectedDate: date, view: { date, mode } };
            }
            return Object.assign({}, state, newState);
        }
        case BsDatepickerActions.CHANGE_VIEWMODE: {
            if (!canSwitchMode(action.payload, state.minMode) || !state.view) {
                return state;
            }
            const date = state.view.date;
            const mode = action.payload;
            const newState = { view: { date, mode } };
            return Object.assign({}, state, newState);
        }
        case BsDatepickerActions.HOVER: {
            return Object.assign({}, state, { hoveredDate: action.payload });
        }
        case BsDatepickerActions.SELECT: {
            if (!state.view) {
                return state;
            }
            const newState = {
                selectedDate: action.payload,
                view: state.view
            };
            if (Array.isArray(state.selectedTime)) {
                const _time = state.selectedTime[0];
                if (newState.selectedDate && _time) {
                    copyTime(newState.selectedDate, _time);
                }
            }
            const mode = state.view.mode;
            const _date = action.payload || state.view.date;
            const date = getViewDate(_date, state.minDate, state.maxDate);
            newState.view = { mode, date };
            return Object.assign({}, state, newState);
        }
        case BsDatepickerActions.SELECT_TIME: {
            const { date, index } = action.payload;
            const selectedTime = state.selectedTime ? [...state.selectedTime] : [];
            selectedTime[index] = date;
            return Object.assign({}, state, { selectedTime });
        }
        case BsDatepickerActions.SET_OPTIONS: {
            if (!state.view) {
                return state;
            }
            const newState = action.payload;
            // preserve view mode
            const mode = newState.minMode ? newState.minMode : state.view.mode;
            const _viewDate = isDateValid(newState.value) && newState.value
                || isArray(newState.value) && isDateValid(newState.value[0]) && newState.value[0]
                || state.view.date;
            const date = getViewDate(_viewDate, newState.minDate, newState.maxDate);
            newState.view = { mode, date };
            // update selected value
            if (newState.value) {
                // if new value is array we work with date range
                if (isArray(newState.value)) {
                    newState.selectedRange = newState.value;
                    newState.selectedTime = newState.value.map((i) => i);
                }
                // if new value is a date -> datepicker
                if (newState.value instanceof Date) {
                    newState.selectedDate = newState.value;
                    newState.selectedTime = [newState.value];
                }
                // provided value is not supported :)
                // need to report it somehow
            }
            return Object.assign({}, state, newState);
        }
        // date range picker
        case BsDatepickerActions.SELECT_RANGE: {
            if (!state.view) {
                return state;
            }
            const newState = {
                selectedRange: action.payload,
                view: state.view
            };
            newState.selectedRange?.forEach((dte, index) => {
                if (Array.isArray(state.selectedTime)) {
                    const _time = state.selectedTime[index];
                    if (_time) {
                        copyTime(dte, _time);
                    }
                }
            });
            const mode = state.view.mode;
            const _date = action.payload && action.payload[0] || state.view.date;
            const date = getViewDate(_date, state.minDate, state.maxDate);
            newState.view = { mode, date };
            return Object.assign({}, state, newState);
        }
        case BsDatepickerActions.SET_MIN_DATE: {
            return Object.assign({}, state, {
                minDate: action.payload
            });
        }
        case BsDatepickerActions.SET_MAX_DATE: {
            return Object.assign({}, state, {
                maxDate: action.payload
            });
        }
        case BsDatepickerActions.SET_IS_DISABLED: {
            return Object.assign({}, state, {
                isDisabled: action.payload
            });
        }
        case BsDatepickerActions.SET_DATE_CUSTOM_CLASSES: {
            return Object.assign({}, state, {
                dateCustomClasses: action.payload
            });
        }
        case BsDatepickerActions.SET_DATE_TOOLTIP_TEXTS: {
            return Object.assign({}, state, {
                dateTooltipTexts: action.payload
            });
        }
        default:
            return state;
    }
}
function calculateReducer(state) {
    if (!state.view) {
        return state;
    }
    // how many calendars
    let displayMonths;
    if (state.displayOneMonthRange &&
        isDisplayOneMonth(state.view.date, state.minDate, state.maxDate)) {
        displayMonths = 1;
    }
    else {
        displayMonths = state.displayMonths || 1;
    }
    // use selected date on initial rendering if set
    let viewDate = state.view.date;
    if (state.view.mode === 'day' && state.monthViewOptions) {
        if (state.showPreviousMonth && state.selectedRange && state.selectedRange.length === 0) {
            viewDate = shiftDate(viewDate, { month: -1 });
        }
        state.monthViewOptions.firstDayOfWeek = getLocale(state.locale).firstDayOfWeek();
        let monthsModel = new Array(displayMonths);
        for (let monthIndex = 0; monthIndex < displayMonths; monthIndex++) {
            // todo: for unlinked calendars it will be harder
            monthsModel[monthIndex] = calcDaysCalendar(viewDate, state.monthViewOptions);
            viewDate = shiftDate(viewDate, { month: 1 });
        }
        // Check if parameter enabled and check if it's not months navigation event
        if (state.preventChangeToNextMonth && state.flaggedMonths && state.hoveredDate) {
            const viewMonth = calcDaysCalendar(state.view.date, state.monthViewOptions);
            // Check if viewed right month same as in flaggedMonths state, then override months model with flaggedMonths
            if (state.flaggedMonths.length && state.flaggedMonths[1].month.getMonth() === viewMonth.month.getMonth()) {
                monthsModel = state.flaggedMonths
                    .map(item => {
                    if (state.monthViewOptions) {
                        return calcDaysCalendar(item.month, state.monthViewOptions);
                    }
                    return null;
                })
                    .filter(item => item !== null);
            }
        }
        return Object.assign({}, state, { monthsModel });
    }
    if (state.view.mode === 'month') {
        const monthsCalendar = new Array(displayMonths);
        for (let calendarIndex = 0; calendarIndex < displayMonths; calendarIndex++) {
            // todo: for unlinked calendars it will be harder
            monthsCalendar[calendarIndex] = formatMonthsCalendar(viewDate, getFormatOptions(state));
            viewDate = shiftDate(viewDate, { year: 1 });
        }
        return Object.assign({}, state, { monthsCalendar });
    }
    if (state.view.mode === 'year') {
        const yearsCalendarModel = new Array(displayMonths);
        for (let calendarIndex = 0; calendarIndex < displayMonths; calendarIndex++) {
            // todo: for unlinked calendars it will be harder
            yearsCalendarModel[calendarIndex] = formatYearsCalendar(viewDate, getFormatOptions(state), state.minMode === 'year' ? getYearsCalendarInitialDate(state, calendarIndex) : undefined);
            viewDate = shiftDate(viewDate, { year: yearsPerCalendar });
        }
        return Object.assign({}, state, { yearsCalendarModel });
    }
    return state;
}
function formatReducer(state) {
    if (!state.view) {
        return state;
    }
    if (state.view.mode === 'day' && state.monthsModel) {
        const formattedMonths = state.monthsModel.map((month, monthIndex) => formatDaysCalendar(month, getFormatOptions(state), monthIndex));
        return Object.assign({}, state, { formattedMonths });
    }
    // how many calendars
    const displayMonths = state.displayMonths || 1;
    // check initial rendering
    // use selected date on initial rendering if set
    let viewDate = state.view.date;
    if (state.view.mode === 'month') {
        const monthsCalendar = new Array(displayMonths);
        for (let calendarIndex = 0; calendarIndex < displayMonths; calendarIndex++) {
            // todo: for unlinked calendars it will be harder
            monthsCalendar[calendarIndex] = formatMonthsCalendar(viewDate, getFormatOptions(state));
            viewDate = shiftDate(viewDate, { year: 1 });
        }
        return Object.assign({}, state, { monthsCalendar });
    }
    if (state.view.mode === 'year') {
        const yearsCalendarModel = new Array(displayMonths);
        for (let calendarIndex = 0; calendarIndex < displayMonths; calendarIndex++) {
            // todo: for unlinked calendars it will be harder
            yearsCalendarModel[calendarIndex] = formatYearsCalendar(viewDate, getFormatOptions(state));
            viewDate = shiftDate(viewDate, { year: 16 });
        }
        return Object.assign({}, state, { yearsCalendarModel });
    }
    return state;
}
function flagReducer(state) {
    if (!state.view) {
        return state;
    }
    const displayMonths = isDisplayOneMonth(state.view.date, state.minDate, state.maxDate) ? 1 : state.displayMonths;
    if (state.formattedMonths && state.view.mode === 'day') {
        const flaggedMonths = state.formattedMonths.map((formattedMonth, monthIndex) => flagDaysCalendar(formattedMonth, {
            isDisabled: state.isDisabled,
            minDate: state.minDate,
            maxDate: state.maxDate,
            daysDisabled: state.daysDisabled,
            datesDisabled: state.datesDisabled,
            datesEnabled: state.datesEnabled,
            hoveredDate: state.hoveredDate,
            selectedDate: state.selectedDate,
            selectedRange: state.selectedRange,
            displayMonths,
            dateCustomClasses: state.dateCustomClasses,
            dateTooltipTexts: state.dateTooltipTexts,
            monthIndex
        }));
        return Object.assign({}, state, { flaggedMonths });
    }
    if (state.view.mode === 'month' && state.monthsCalendar) {
        const flaggedMonthsCalendar = state.monthsCalendar.map((formattedMonth, monthIndex) => flagMonthsCalendar(formattedMonth, {
            isDisabled: state.isDisabled,
            minDate: state.minDate,
            maxDate: state.maxDate,
            hoveredMonth: state.hoveredMonth,
            selectedDate: state.selectedDate,
            datesDisabled: state.datesDisabled,
            datesEnabled: state.datesEnabled,
            selectedRange: state.selectedRange,
            displayMonths,
            monthIndex
        }));
        return Object.assign({}, state, { flaggedMonthsCalendar });
    }
    if (state.view.mode === 'year' && state.yearsCalendarModel) {
        const yearsCalendarFlagged = state.yearsCalendarModel.map((formattedMonth, yearIndex) => flagYearsCalendar(formattedMonth, {
            isDisabled: state.isDisabled,
            minDate: state.minDate,
            maxDate: state.maxDate,
            hoveredYear: state.hoveredYear,
            selectedDate: state.selectedDate,
            datesDisabled: state.datesDisabled,
            datesEnabled: state.datesEnabled,
            selectedRange: state.selectedRange,
            displayMonths,
            yearIndex
        }));
        return Object.assign({}, state, { yearsCalendarFlagged });
    }
    return state;
}
function navigateOffsetReducer(state, action) {
    if (!state.view) {
        return state;
    }
    const date = shiftViewDate(state, action);
    if (!date) {
        return state;
    }
    const newState = {
        view: {
            mode: state.view.mode,
            date
        }
    };
    return Object.assign({}, state, newState);
}
function shiftViewDate(state, action) {
    if (!state.view) {
        return undefined;
    }
    if (state.view.mode === 'year' && state.minMode === 'year') {
        const initialDate = getYearsCalendarInitialDate(state, 0);
        if (initialDate) {
            const middleDate = shiftDate(initialDate, { year: -initialYearShift });
            return shiftDate(middleDate, action.payload);
        }
    }
    return shiftDate(startOf(state.view.date, 'month'), action.payload);
}
function getFormatOptions(state) {
    return {
        locale: state.locale,
        monthTitle: state.monthTitle,
        yearTitle: state.yearTitle,
        dayLabel: state.dayLabel,
        monthLabel: state.monthLabel,
        yearLabel: state.yearLabel,
        weekNumbers: state.weekNumbers
    };
}
/**
 * if view date is provided (bsValue|ngModel) it should be shown
 * if view date is not provider:
 * if minDate>currentDate (default view value), show minDate
 * if maxDate<currentDate(default view value) show maxDate
 */
function getViewDate(viewDate, minDate, maxDate) {
    const _date = Array.isArray(viewDate) ? viewDate[0] : viewDate;
    if (minDate && isAfter(minDate, _date, 'day')) {
        return minDate;
    }
    if (maxDate && isBefore(maxDate, _date, 'day')) {
        return maxDate;
    }
    return _date;
}
function isDisplayOneMonth(viewDate, minDate, maxDate) {
    if (maxDate && isSame(maxDate, viewDate, 'day')) {
        return true;
    }
    return minDate && maxDate && minDate.getMonth() === maxDate.getMonth();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnMtZGF0ZXBpY2tlci5yZWR1Y2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL2RhdGVwaWNrZXIvcmVkdWNlci9icy1kYXRlcGlja2VyLnJlZHVjZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUE0QyxzQkFBc0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRXpHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzlELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ2hFLE9BQU8sRUFDTCxXQUFXLEVBQ1gsU0FBUyxFQUNULE9BQU8sRUFDUCxXQUFXLEVBQ1gsT0FBTyxFQUNQLFNBQVMsRUFDVCxPQUFPLEVBQ1AsUUFBUSxFQUNSLE1BQU0sRUFDUCxNQUFNLHVCQUF1QixDQUFDO0FBQy9CLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsZ0JBQWdCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUVsRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN6RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFHcEQsTUFBTSxVQUFVLG1CQUFtQixDQUFDLFFBQTJCLHNCQUFzQixFQUNqRCxNQUFjO0lB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QUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztJQUUvRCxJQUFJLE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQzlDLE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUM7SUFFRCxJQUFJLE9BQU8sSUFBSSxRQUFRLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQy9DLE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUM7SUFFRCxPQUFPLEtBQUssQ0FBQztBQUNmLENBQUM7QUFFRCxTQUFTLGlCQUFpQixDQUFDLFFBQWMsRUFBRSxPQUFjLEVBQUUsT0FBYztJQUN2RSxJQUFJLE9BQU8sSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ2hELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVELE9BQU8sT0FBTyxJQUFJLE9BQU8sSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFLEtBQUssT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBQ3pFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBCc0RhdGVwaWNrZXJTdGF0ZSwgQnNEYXRlcGlja2VyVmlld1N0YXRlLCBpbml0aWFsRGF0ZXBpY2tlclN0YXRlIH0gZnJvbSAnLi9icy1kYXRlcGlja2VyLnN0YXRlJztcbmltcG9ydCB7IEFjdGlvbiB9IGZyb20gJ25neC1ib290c3RyYXAvbWluaS1uZ3J4JztcbmltcG9ydCB7IEJzRGF0ZXBpY2tlckFjdGlvbnMgfSBmcm9tICcuL2JzLWRhdGVwaWNrZXIuYWN0aW9ucyc7XG5pbXBvcnQgeyBjYWxjRGF5c0NhbGVuZGFyIH0gZnJvbSAnLi4vZW5naW5lL2NhbGMtZGF5cy1jYWxlbmRhcic7XG5pbXBvcnQgeyBmb3JtYXREYXlzQ2FsZW5kYXIgfSBmcm9tICcuLi9lbmdpbmUvZm9ybWF0LWRheXMtY2FsZW5kYXInO1xuaW1wb3J0IHsgZmxhZ0RheXNDYWxlbmRhciB9IGZyb20gJy4uL2VuZ2luZS9mbGFnLWRheXMtY2FsZW5kYXInO1xuaW1wb3J0IHtcbiAgc2V0RnVsbERhdGUsXG4gIHNoaWZ0RGF0ZSxcbiAgaXNBcnJheSxcbiAgaXNEYXRlVmFsaWQsXG4gIHN0YXJ0T2YsXG4gIGdldExvY2FsZSxcbiAgaXNBZnRlcixcbiAgaXNCZWZvcmUsXG4gIGlzU2FtZVxufSBmcm9tICduZ3gtYm9vdHN0cmFwL2Nocm9ub3MnO1xuaW1wb3J0IHsgY2FuU3dpdGNoTW9kZSB9IGZyb20gJy4uL2VuZ2luZS92aWV3LW1vZGUnO1xuaW1wb3J0IHsgZm9ybWF0TW9udGhzQ2FsZW5kYXIgfSBmcm9tICcuLi9lbmdpbmUvZm9ybWF0LW1vbnRocy1jYWxlbmRhcic7XG5pbXBvcnQgeyBmbGFnTW9udGhzQ2FsZW5kYXIgfSBmcm9tICcuLi9lbmdpbmUvZmxhZy1tb250aHMtY2FsZW5kYXInO1xuaW1wb3J0IHsgZm9ybWF0WWVhcnNDYWxlbmRhciwgaW5pdGlhbFllYXJTaGlmdCwgeWVhcnNQZXJDYWxlbmRhciB9IGZyb20gJy4uL2VuZ2luZS9mb3JtYXQteWVhcnMtY2FsZW5kYXInO1xuaW1wb3J0IHsgZmxhZ1llYXJzQ2FsZW5kYXIgfSBmcm9tICcuLi9lbmdpbmUvZmxhZy15ZWFycy1jYWxlbmRhcic7XG5pbXBvcnQgeyBCc1ZpZXdOYXZpZ2F0aW9uRXZlbnQsIERhdGVwaWNrZXJGb3JtYXRPcHRpb25zLCBCc0RhdGVwaWNrZXJWaWV3TW9kZSB9IGZyb20gJy4uL21vZGVscyc7XG5pbXBvcnQgeyBnZXRZZWFyc0NhbGVuZGFySW5pdGlhbERhdGUgfSBmcm9tICcuLi91dGlscy9icy1jYWxlbmRhci11dGlscyc7XG5pbXBvcnQgeyBjb3B5VGltZSB9IGZyb20gJy4uL3V0aWxzL2NvcHktdGltZS11dGlscyc7XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGJzRGF0ZXBpY2tlclJlZHVjZXIoc3RhdGU6IEJzRGF0ZXBpY2tlclN0YXRlID0gaW5pdGlhbERhdGVwaWNrZXJTdGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjogQWN0aW9uKTogQnNEYXRlcGlja2VyU3RhdGUge1xuICBzd2l0Y2ggKGFjdGlvbi50eXBlKSB7XG4gICAgY2FzZSBCc0RhdGVwaWNrZXJBY3Rpb25zLkNBTENVTEFURToge1xuICAgICAgcmV0dXJuIGNhbGN1bGF0ZVJlZHVjZXIoc3RhdGUpO1xuICAgIH1cblxuICAgIGNhc2UgQnNEYXRlcGlja2VyQWN0aW9ucy5GT1JNQVQ6IHtcbiAgICAgIHJldHVybiBmb3JtYXRSZWR1Y2VyKHN0YXRlKTtcbiAgICB9XG5cbiAgICBjYXNlIEJzRGF0ZXBpY2tlckFjdGlvbnMuRkxBRzoge1xuICAgICAgcmV0dXJuIGZsYWdSZWR1Y2VyKHN0YXRlKTtcbiAgICB9XG5cbiAgICBjYXNlIEJzRGF0ZXBpY2tlckFjdGlvbnMuTkFWSUdBVEVfT0ZGU0VUOiB7XG4gICAgICByZXR1cm4gbmF2aWdhdGVPZmZzZXRSZWR1Y2VyKHN0YXRlLCBhY3Rpb24pO1xuICAgIH1cblxuICAgIGNhc2UgQnNEYXRlcGlja2VyQWN0aW9ucy5OQVZJR0FURV9UTzoge1xuICAgICAgY29uc3QgcGF5bG9hZDogQnNWaWV3TmF2aWdhdGlvbkV2ZW50ID0gYWN0aW9uLnBheWxvYWQ7XG4gICAgICBpZiAoIXN0YXRlLnZpZXcgfHwgIXBheWxvYWQudW5pdCkge1xuICAgICAgICByZXR1cm4gc3RhdGU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGRhdGUgPSBzZXRGdWxsRGF0ZShzdGF0ZS52aWV3LmRhdGUsIHBheWxvYWQudW5pdCk7XG4gICAgICBsZXQgbmV3U3RhdGU7XG4gICAgICBsZXQgbW9kZTogQnNEYXRlcGlja2VyVmlld01vZGU7XG4gICAgICBpZiAoY2FuU3dpdGNoTW9kZShwYXlsb2FkLnZpZXdNb2RlLCBzdGF0ZS5taW5Nb2RlKSkge1xuICAgICAgICBtb2RlID0gcGF5bG9hZC52aWV3TW9kZTtcbiAgICAgICAgbmV3U3RhdGUgPSB7IHZpZXc6IHsgZGF0ZSwgbW9kZSB9IH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtb2RlID0gc3RhdGUudmlldy5tb2RlO1xuICAgICAgICBuZXdTdGF0ZSA9IHsgc2VsZWN0ZWREYXRlOiBkYXRlLCB2aWV3OiB7IGRhdGUsIG1vZGUgfSB9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUsIG5ld1N0YXRlKTtcbiAgICB9XG5cbiAgICBjYXNlIEJzRGF0ZXBpY2tlckFjdGlvbnMuQ0hBTkdFX1ZJRVdNT0RFOiB7XG4gICAgICBpZiAoIWNhblN3aXRjaE1vZGUoYWN0aW9uLnBheWxvYWQsIHN0YXRlLm1pbk1vZGUpIHx8ICFzdGF0ZS52aWV3KSB7XG4gICAgICAgIHJldHVybiBzdGF0ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGF0ZSA9IHN0YXRlLnZpZXcuZGF0ZTtcbiAgICAgIGNvbnN0IG1vZGUgPSBhY3Rpb24ucGF5bG9hZDtcbiAgICAgIGNvbnN0IG5ld1N0YXRlID0geyB2aWV3OiB7IGRhdGUsIG1vZGUgfSB9O1xuXG4gICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUsIG5ld1N0YXRlKTtcbiAgICB9XG5cbiAgICBjYXNlIEJzRGF0ZXBpY2tlckFjdGlvbnMuSE9WRVI6IHtcbiAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBzdGF0ZSwgeyBob3ZlcmVkRGF0ZTogYWN0aW9uLnBheWxvYWQgfSk7XG4gICAgfVxuXG4gICAgY2FzZSBCc0RhdGVwaWNrZXJBY3Rpb25zLlNFTEVDVDoge1xuICAgICAgaWYgKCFzdGF0ZS52aWV3KSB7XG4gICAgICAgIHJldHVybiBzdGF0ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbmV3U3RhdGUgPSB7XG4gICAgICAgIHNlbGVjdGVkRGF0ZTogYWN0aW9uLnBheWxvYWQsXG4gICAgICAgIHZpZXc6IHN0YXRlLnZpZXdcbiAgICAgIH07XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHN0YXRlLnNlbGVjdGVkVGltZSkpIHtcbiAgICAgICAgY29uc3QgX3RpbWUgPSBzdGF0ZS5zZWxlY3RlZFRpbWVbMF07XG4gICAgICAgIGlmIChuZXdTdGF0ZS5zZWxlY3RlZERhdGUgJiYgX3RpbWUpIHtcbiAgICAgICAgICBjb3B5VGltZShuZXdTdGF0ZS5zZWxlY3RlZERhdGUsIF90aW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCBtb2RlID0gc3RhdGUudmlldy5tb2RlO1xuICAgICAgY29uc3QgX2RhdGUgPSBhY3Rpb24ucGF5bG9hZCB8fCBzdGF0ZS52aWV3LmRhdGU7XG4gICAgICBjb25zdCBkYXRlID0gZ2V0Vmlld0RhdGUoX2RhdGUsIHN0YXRlLm1pbkRhdGUsIHN0YXRlLm1heERhdGUpO1xuICAgICAgbmV3U3RhdGUudmlldyA9IHsgbW9kZSwgZGF0ZSB9O1xuXG4gICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUsIG5ld1N0YXRlKTtcbiAgICB9XG5cbiAgICBjYXNlIEJzRGF0ZXBpY2tlckFjdGlvbnMuU0VMRUNUX1RJTUU6IHtcbiAgICAgIGNvbnN0IHtkYXRlLCBpbmRleH0gPSBhY3Rpb24ucGF5bG9hZDtcbiAgICAgIGNvbnN0IHNlbGVjdGVkVGltZSA9IHN0YXRlLnNlbGVjdGVkVGltZSA/IFsuLi5zdGF0ZS5zZWxlY3RlZFRpbWVdIDogW107XG4gICAgICBzZWxlY3RlZFRpbWVbaW5kZXhdID0gZGF0ZTtcbiAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBzdGF0ZSwgeyBzZWxlY3RlZFRpbWUgfSk7XG4gICAgfVxuXG4gICAgY2FzZSBCc0RhdGVwaWNrZXJBY3Rpb25zLlNFVF9PUFRJT05TOiB7XG4gICAgICBpZiAoIXN0YXRlLnZpZXcpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBuZXdTdGF0ZSA9IGFjdGlvbi5wYXlsb2FkO1xuICAgICAgLy8gcHJlc2VydmUgdmlldyBtb2RlXG4gICAgICBjb25zdCBtb2RlID0gbmV3U3RhdGUubWluTW9kZSA/IG5ld1N0YXRlLm1pbk1vZGUgOiBzdGF0ZS52aWV3Lm1vZGU7XG4gICAgICBjb25zdCBfdmlld0RhdGUgPSBpc0RhdGVWYWxpZChuZXdTdGF0ZS52YWx1ZSkgJiYgbmV3U3RhdGUudmFsdWVcbiAgICAgICAgfHwgaXNBcnJheShuZXdTdGF0ZS52YWx1ZSkgJiYgaXNEYXRlVmFsaWQobmV3U3RhdGUudmFsdWVbMF0pICYmIG5ld1N0YXRlLnZhbHVlWzBdXG4gICAgICAgIHx8IHN0YXRlLnZpZXcuZGF0ZTtcbiAgICAgIGNvbnN0IGRhdGUgPSBnZXRWaWV3RGF0ZShfdmlld0RhdGUsIG5ld1N0YXRlLm1pbkRhdGUsIG5ld1N0YXRlLm1heERhdGUpO1xuICAgICAgbmV3U3RhdGUudmlldyA9IHsgbW9kZSwgZGF0ZSB9O1xuICAgICAgLy8gdXBkYXRlIHNlbGVjdGVkIHZhbHVlXG4gICAgICBpZiAobmV3U3RhdGUudmFsdWUpIHtcbiAgICAgICAgLy8gaWYgbmV3IHZhbHVlIGlzIGFycmF5IHdlIHdvcmsgd2l0aCBkYXRlIHJhbmdlXG4gICAgICAgIGlmIChpc0FycmF5KG5ld1N0YXRlLnZhbHVlKSkge1xuICAgICAgICAgIG5ld1N0YXRlLnNlbGVjdGVkUmFuZ2UgPSBuZXdTdGF0ZS52YWx1ZTtcbiAgICAgICAgICBuZXdTdGF0ZS5zZWxlY3RlZFRpbWUgPSBuZXdTdGF0ZS52YWx1ZS5tYXAoKGk6IERhdGUpID0+IGkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWYgbmV3IHZhbHVlIGlzIGEgZGF0ZSAtPiBkYXRlcGlja2VyXG4gICAgICAgIGlmIChuZXdTdGF0ZS52YWx1ZSBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICAgICAgICBuZXdTdGF0ZS5zZWxlY3RlZERhdGUgPSBuZXdTdGF0ZS52YWx1ZTtcbiAgICAgICAgICBuZXdTdGF0ZS5zZWxlY3RlZFRpbWUgPSBbbmV3U3RhdGUudmFsdWVdO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gcHJvdmlkZWQgdmFsdWUgaXMgbm90IHN1cHBvcnRlZCA6KVxuICAgICAgICAvLyBuZWVkIHRvIHJlcG9ydCBpdCBzb21laG93XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBzdGF0ZSwgbmV3U3RhdGUpO1xuICAgIH1cblxuICAgIC8vIGRhdGUgcmFuZ2UgcGlja2VyXG4gICAgY2FzZSBCc0RhdGVwaWNrZXJBY3Rpb25zLlNFTEVDVF9SQU5HRToge1xuICAgICAgaWYgKCFzdGF0ZS52aWV3KSB7XG4gICAgICAgIHJldHVybiBzdGF0ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbmV3U3RhdGUgPSB7XG4gICAgICAgIHNlbGVjdGVkUmFuZ2U6IGFjdGlvbi5wYXlsb2FkLFxuICAgICAgICB2aWV3OiBzdGF0ZS52aWV3XG4gICAgICB9O1xuICAgICAgbmV3U3RhdGUuc2VsZWN0ZWRSYW5nZT8uZm9yRWFjaCgoZHRlOiBEYXRlLCBpbmRleDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHN0YXRlLnNlbGVjdGVkVGltZSkpIHtcbiAgICAgICAgICBjb25zdCBfdGltZSA9IHN0YXRlLnNlbGVjdGVkVGltZVtpbmRleF07XG4gICAgICAgICAgaWYgKF90aW1lKSB7XG4gICAgICAgICAgICBjb3B5VGltZShkdGUsIF90aW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBtb2RlID0gc3RhdGUudmlldy5tb2RlO1xuICAgICAgY29uc3QgX2RhdGUgPSBhY3Rpb24ucGF5bG9hZCAmJiBhY3Rpb24ucGF5bG9hZFswXSB8fCBzdGF0ZS52aWV3LmRhdGU7XG4gICAgICBjb25zdCBkYXRlID0gZ2V0Vmlld0RhdGUoX2RhdGUsIHN0YXRlLm1pbkRhdGUsIHN0YXRlLm1heERhdGUpO1xuICAgICAgbmV3U3RhdGUudmlldyA9IHsgbW9kZSwgZGF0ZSB9O1xuXG4gICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUsIG5ld1N0YXRlKTtcbiAgICB9XG5cbiAgICBjYXNlIEJzRGF0ZXBpY2tlckFjdGlvbnMuU0VUX01JTl9EQVRFOiB7XG4gICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUsIHtcbiAgICAgICAgbWluRGF0ZTogYWN0aW9uLnBheWxvYWRcbiAgICAgIH0pO1xuICAgIH1cbiAgICBjYXNlIEJzRGF0ZXBpY2tlckFjdGlvbnMuU0VUX01BWF9EQVRFOiB7XG4gICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUsIHtcbiAgICAgICAgbWF4RGF0ZTogYWN0aW9uLnBheWxvYWRcbiAgICAgIH0pO1xuICAgIH1cbiAgICBjYXNlIEJzRGF0ZXBpY2tlckFjdGlvbnMuU0VUX0lTX0RJU0FCTEVEOiB7XG4gICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUsIHtcbiAgICAgICAgaXNEaXNhYmxlZDogYWN0aW9uLnBheWxvYWRcbiAgICAgIH0pO1xuICAgIH1cbiAgICBjYXNlIEJzRGF0ZXBpY2tlckFjdGlvbnMuU0VUX0RBVEVfQ1VTVE9NX0NMQVNTRVM6IHtcbiAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBzdGF0ZSwge1xuICAgICAgICBkYXRlQ3VzdG9tQ2xhc3NlczogYWN0aW9uLnBheWxvYWRcbiAgICAgIH0pO1xuICAgIH1cbiAgICBjYXNlIEJzRGF0ZXBpY2tlckFjdGlvbnMuU0VUX0RBVEVfVE9PTFRJUF9URVhUUzoge1xuICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIHN0YXRlLCB7XG4gICAgICAgIGRhdGVUb29sdGlwVGV4dHM6IGFjdGlvbi5wYXlsb2FkXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHN0YXRlO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNhbGN1bGF0ZVJlZHVjZXIoc3RhdGU6IEJzRGF0ZXBpY2tlclN0YXRlKTogQnNEYXRlcGlja2VyU3RhdGUge1xuICBpZiAoIXN0YXRlLnZpZXcpIHtcbiAgICByZXR1cm4gc3RhdGU7XG4gIH1cblxuICAvLyBob3cgbWFueSBjYWxlbmRhcnNcbiAgbGV0IGRpc3BsYXlNb250aHM6IG51bWJlciB8IHVuZGVmaW5lZDtcbiAgaWYgKHN0YXRlLmRpc3BsYXlPbmVNb250aFJhbmdlICYmXG4gICAgaXNEaXNwbGF5T25lTW9udGgoc3RhdGUudmlldy5kYXRlLCBzdGF0ZS5taW5EYXRlLCBzdGF0ZS5tYXhEYXRlKSkge1xuICAgIGRpc3BsYXlNb250aHMgPSAxO1xuICB9IGVsc2Uge1xuICAgIGRpc3BsYXlNb250aHMgPSBzdGF0ZS5kaXNwbGF5TW9udGhzIHx8IDE7XG4gIH1cblxuICAvLyB1c2Ugc2VsZWN0ZWQgZGF0ZSBvbiBpbml0aWFsIHJlbmRlcmluZyBpZiBzZXRcbiAgbGV0IHZpZXdEYXRlID0gc3RhdGUudmlldy5kYXRlO1xuXG4gIGlmIChzdGF0ZS52aWV3Lm1vZGUgPT09ICdkYXknICYmIHN0YXRlLm1vbnRoVmlld09wdGlvbnMpIHtcbiAgICBpZiAoc3RhdGUuc2hvd1ByZXZpb3VzTW9udGggJiYgc3RhdGUuc2VsZWN0ZWRSYW5nZSAmJiBzdGF0ZS5zZWxlY3RlZFJhbmdlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdmlld0RhdGUgPSBzaGlmdERhdGUodmlld0RhdGUsIHsgbW9udGg6IC0xIH0pO1xuICAgIH1cblxuICAgIHN0YXRlLm1vbnRoVmlld09wdGlvbnMuZmlyc3REYXlPZldlZWsgPSBnZXRMb2NhbGUoc3RhdGUubG9jYWxlKS5maXJzdERheU9mV2VlaygpO1xuICAgIGxldCBtb250aHNNb2RlbCA9IG5ldyBBcnJheShkaXNwbGF5TW9udGhzKTtcbiAgICBmb3IgKGxldCBtb250aEluZGV4ID0gMDsgbW9udGhJbmRleCA8IGRpc3BsYXlNb250aHM7IG1vbnRoSW5kZXgrKykge1xuICAgICAgLy8gdG9kbzogZm9yIHVubGlua2VkIGNhbGVuZGFycyBpdCB3aWxsIGJlIGhhcmRlclxuICAgICAgbW9udGhzTW9kZWxbbW9udGhJbmRleF0gPSBjYWxjRGF5c0NhbGVuZGFyKFxuICAgICAgICB2aWV3RGF0ZSxcbiAgICAgICAgc3RhdGUubW9udGhWaWV3T3B0aW9uc1xuICAgICAgKTtcbiAgICAgIHZpZXdEYXRlID0gc2hpZnREYXRlKHZpZXdEYXRlLCB7IG1vbnRoOiAxIH0pO1xuICAgIH1cbiAgICAvLyBDaGVjayBpZiBwYXJhbWV0ZXIgZW5hYmxlZCBhbmQgY2hlY2sgaWYgaXQncyBub3QgbW9udGhzIG5hdmlnYXRpb24gZXZlbnRcbiAgICBpZiAoc3RhdGUucHJldmVudENoYW5nZVRvTmV4dE1vbnRoICYmIHN0YXRlLmZsYWdnZWRNb250aHMgJiYgc3RhdGUuaG92ZXJlZERhdGUpIHtcbiAgICAgIGNvbnN0IHZpZXdNb250aCA9IGNhbGNEYXlzQ2FsZW5kYXIoc3RhdGUudmlldy5kYXRlLCBzdGF0ZS5tb250aFZpZXdPcHRpb25zKTtcbiAgICAgIC8vIENoZWNrIGlmIHZpZXdlZCByaWdodCBtb250aCBzYW1lIGFzIGluIGZsYWdnZWRNb250aHMgc3RhdGUsIHRoZW4gb3ZlcnJpZGUgbW9udGhzIG1vZGVsIHdpdGggZmxhZ2dlZE1vbnRoc1xuICAgICAgaWYgKHN0YXRlLmZsYWdnZWRNb250aHMubGVuZ3RoICYmIHN0YXRlLmZsYWdnZWRNb250aHNbMV0ubW9udGguZ2V0TW9udGgoKSA9PT0gdmlld01vbnRoLm1vbnRoLmdldE1vbnRoKCkpIHtcbiAgICAgICAgbW9udGhzTW9kZWwgPSBzdGF0ZS5mbGFnZ2VkTW9udGhzXG4gICAgICAgICAgLm1hcChpdGVtID0+IHtcbiAgICAgICAgICAgIGlmIChzdGF0ZS5tb250aFZpZXdPcHRpb25zKSB7XG4gICAgICAgICAgICAgIHJldHVybiBjYWxjRGF5c0NhbGVuZGFyKFxuICAgICAgICAgICAgICAgIGl0ZW0ubW9udGgsXG4gICAgICAgICAgICAgICAgc3RhdGUubW9udGhWaWV3T3B0aW9uc1xuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAuZmlsdGVyKGl0ZW0gPT4gaXRlbSAhPT0gbnVsbCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIHN0YXRlLCB7IG1vbnRoc01vZGVsIH0pO1xuICB9XG5cbiAgaWYgKHN0YXRlLnZpZXcubW9kZSA9PT0gJ21vbnRoJykge1xuICAgIGNvbnN0IG1vbnRoc0NhbGVuZGFyID0gbmV3IEFycmF5KGRpc3BsYXlNb250aHMpO1xuICAgIGZvciAoXG4gICAgICBsZXQgY2FsZW5kYXJJbmRleCA9IDA7XG4gICAgICBjYWxlbmRhckluZGV4IDwgZGlzcGxheU1vbnRocztcbiAgICAgIGNhbGVuZGFySW5kZXgrK1xuICAgICkge1xuICAgICAgLy8gdG9kbzogZm9yIHVubGlua2VkIGNhbGVuZGFycyBpdCB3aWxsIGJlIGhhcmRlclxuICAgICAgbW9udGhzQ2FsZW5kYXJbY2FsZW5kYXJJbmRleF0gPSBmb3JtYXRNb250aHNDYWxlbmRhcihcbiAgICAgICAgdmlld0RhdGUsXG4gICAgICAgIGdldEZvcm1hdE9wdGlvbnMoc3RhdGUpXG4gICAgICApO1xuICAgICAgdmlld0RhdGUgPSBzaGlmdERhdGUodmlld0RhdGUsIHsgeWVhcjogMSB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUsIHsgbW9udGhzQ2FsZW5kYXIgfSk7XG4gIH1cblxuICBpZiAoc3RhdGUudmlldy5tb2RlID09PSAneWVhcicpIHtcbiAgICBjb25zdCB5ZWFyc0NhbGVuZGFyTW9kZWwgPSBuZXcgQXJyYXkoZGlzcGxheU1vbnRocyk7XG5cbiAgICBmb3IgKFxuICAgICAgbGV0IGNhbGVuZGFySW5kZXggPSAwO1xuICAgICAgY2FsZW5kYXJJbmRleCA8IGRpc3BsYXlNb250aHM7XG4gICAgICBjYWxlbmRhckluZGV4KytcbiAgICApIHtcbiAgICAgIC8vIHRvZG86IGZvciB1bmxpbmtlZCBjYWxlbmRhcnMgaXQgd2lsbCBiZSBoYXJkZXJcbiAgICAgIHllYXJzQ2FsZW5kYXJNb2RlbFtjYWxlbmRhckluZGV4XSA9IGZvcm1hdFllYXJzQ2FsZW5kYXIoXG4gICAgICAgIHZpZXdEYXRlLFxuICAgICAgICBnZXRGb3JtYXRPcHRpb25zKHN0YXRlKSxcbiAgICAgICAgc3RhdGUubWluTW9kZSA9PT0gJ3llYXInID8gZ2V0WWVhcnNDYWxlbmRhckluaXRpYWxEYXRlKHN0YXRlLCBjYWxlbmRhckluZGV4KSA6IHVuZGVmaW5lZFxuICAgICAgKTtcbiAgICAgIHZpZXdEYXRlID0gc2hpZnREYXRlKHZpZXdEYXRlLCB7IHllYXI6IHllYXJzUGVyQ2FsZW5kYXIgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIHN0YXRlLCB7IHllYXJzQ2FsZW5kYXJNb2RlbCB9KTtcbiAgfVxuXG4gIHJldHVybiBzdGF0ZTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0UmVkdWNlcihzdGF0ZTogQnNEYXRlcGlja2VyU3RhdGUpOiBCc0RhdGVwaWNrZXJTdGF0ZSB7XG4gIGlmICghc3RhdGUudmlldykge1xuICAgIHJldHVybiBzdGF0ZTtcbiAgfVxuXG4gIGlmIChzdGF0ZS52aWV3Lm1vZGUgPT09ICdkYXknICYmIHN0YXRlLm1vbnRoc01vZGVsKSB7XG4gICAgY29uc3QgZm9ybWF0dGVkTW9udGhzID0gc3RhdGUubW9udGhzTW9kZWwubWFwKChtb250aCwgbW9udGhJbmRleCkgPT5cbiAgICAgIGZvcm1hdERheXNDYWxlbmRhcihtb250aCwgZ2V0Rm9ybWF0T3B0aW9ucyhzdGF0ZSksIG1vbnRoSW5kZXgpXG4gICAgKTtcblxuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBzdGF0ZSwgeyBmb3JtYXR0ZWRNb250aHMgfSk7XG4gIH1cblxuICAvLyBob3cgbWFueSBjYWxlbmRhcnNcbiAgY29uc3QgZGlzcGxheU1vbnRocyA9IHN0YXRlLmRpc3BsYXlNb250aHMgfHwgMTtcbiAgLy8gY2hlY2sgaW5pdGlhbCByZW5kZXJpbmdcbiAgLy8gdXNlIHNlbGVjdGVkIGRhdGUgb24gaW5pdGlhbCByZW5kZXJpbmcgaWYgc2V0XG4gIGxldCB2aWV3RGF0ZSA9IHN0YXRlLnZpZXcuZGF0ZTtcblxuICBpZiAoc3RhdGUudmlldy5tb2RlID09PSAnbW9udGgnKSB7XG4gICAgY29uc3QgbW9udGhzQ2FsZW5kYXIgPSBuZXcgQXJyYXkoZGlzcGxheU1vbnRocyk7XG4gICAgZm9yIChcbiAgICAgIGxldCBjYWxlbmRhckluZGV4ID0gMDtcbiAgICAgIGNhbGVuZGFySW5kZXggPCBkaXNwbGF5TW9udGhzO1xuICAgICAgY2FsZW5kYXJJbmRleCsrXG4gICAgKSB7XG4gICAgICAvLyB0b2RvOiBmb3IgdW5saW5rZWQgY2FsZW5kYXJzIGl0IHdpbGwgYmUgaGFyZGVyXG4gICAgICBtb250aHNDYWxlbmRhcltjYWxlbmRhckluZGV4XSA9IGZvcm1hdE1vbnRoc0NhbGVuZGFyKFxuICAgICAgICB2aWV3RGF0ZSxcbiAgICAgICAgZ2V0Rm9ybWF0T3B0aW9ucyhzdGF0ZSlcbiAgICAgICk7XG4gICAgICB2aWV3RGF0ZSA9IHNoaWZ0RGF0ZSh2aWV3RGF0ZSwgeyB5ZWFyOiAxIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBzdGF0ZSwgeyBtb250aHNDYWxlbmRhciB9KTtcbiAgfVxuXG4gIGlmIChzdGF0ZS52aWV3Lm1vZGUgPT09ICd5ZWFyJykge1xuICAgIGNvbnN0IHllYXJzQ2FsZW5kYXJNb2RlbCA9IG5ldyBBcnJheShkaXNwbGF5TW9udGhzKTtcbiAgICBmb3IgKFxuICAgICAgbGV0IGNhbGVuZGFySW5kZXggPSAwO1xuICAgICAgY2FsZW5kYXJJbmRleCA8IGRpc3BsYXlNb250aHM7XG4gICAgICBjYWxlbmRhckluZGV4KytcbiAgICApIHtcbiAgICAgIC8vIHRvZG86IGZvciB1bmxpbmtlZCBjYWxlbmRhcnMgaXQgd2lsbCBiZSBoYXJkZXJcbiAgICAgIHllYXJzQ2FsZW5kYXJNb2RlbFtjYWxlbmRhckluZGV4XSA9IGZvcm1hdFllYXJzQ2FsZW5kYXIoXG4gICAgICAgIHZpZXdEYXRlLFxuICAgICAgICBnZXRGb3JtYXRPcHRpb25zKHN0YXRlKVxuICAgICAgKTtcbiAgICAgIHZpZXdEYXRlID0gc2hpZnREYXRlKHZpZXdEYXRlLCB7IHllYXI6IDE2IH0pO1xuICAgIH1cblxuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBzdGF0ZSwgeyB5ZWFyc0NhbGVuZGFyTW9kZWwgfSk7XG4gIH1cblxuICByZXR1cm4gc3RhdGU7XG59XG5cbmZ1bmN0aW9uIGZsYWdSZWR1Y2VyKHN0YXRlOiBCc0RhdGVwaWNrZXJTdGF0ZSk6IEJzRGF0ZXBpY2tlclN0YXRlIHtcbiAgaWYgKCFzdGF0ZS52aWV3KSB7XG4gICAgcmV0dXJuIHN0YXRlO1xuICB9XG5cbiAgY29uc3QgZGlzcGxheU1vbnRocyA9IGlzRGlzcGxheU9uZU1vbnRoKHN0YXRlLnZpZXcuZGF0ZSwgc3RhdGUubWluRGF0ZSwgc3RhdGUubWF4RGF0ZSkgPyAxIDogc3RhdGUuZGlzcGxheU1vbnRocztcbiAgaWYgKHN0YXRlLmZvcm1hdHRlZE1vbnRocyAmJiBzdGF0ZS52aWV3Lm1vZGUgPT09ICdkYXknKSB7XG4gICAgY29uc3QgZmxhZ2dlZE1vbnRocyA9IHN0YXRlLmZvcm1hdHRlZE1vbnRocy5tYXAoXG4gICAgICAoZm9ybWF0dGVkTW9udGgsIG1vbnRoSW5kZXgpID0+XG4gICAgICAgIGZsYWdEYXlzQ2FsZW5kYXIoZm9ybWF0dGVkTW9udGgsIHtcbiAgICAgICAgICBpc0Rpc2FibGVkOiBzdGF0ZS5pc0Rpc2FibGVkLFxuICAgICAgICAgIG1pbkRhdGU6IHN0YXRlLm1pbkRhdGUsXG4gICAgICAgICAgbWF4RGF0ZTogc3RhdGUubWF4RGF0ZSxcbiAgICAgICAgICBkYXlzRGlzYWJsZWQ6IHN0YXRlLmRheXNEaXNhYmxlZCxcbiAgICAgICAgICBkYXRlc0Rpc2FibGVkOiBzdGF0ZS5kYXRlc0Rpc2FibGVkLFxuICAgICAgICAgIGRhdGVzRW5hYmxlZDogc3RhdGUuZGF0ZXNFbmFibGVkLFxuICAgICAgICAgIGhvdmVyZWREYXRlOiBzdGF0ZS5ob3ZlcmVkRGF0ZSxcbiAgICAgICAgICBzZWxlY3RlZERhdGU6IHN0YXRlLnNlbGVjdGVkRGF0ZSxcbiAgICAgICAgICBzZWxlY3RlZFJhbmdlOiBzdGF0ZS5zZWxlY3RlZFJhbmdlLFxuICAgICAgICAgIGRpc3BsYXlNb250aHMsXG4gICAgICAgICAgZGF0ZUN1c3RvbUNsYXNzZXM6IHN0YXRlLmRhdGVDdXN0b21DbGFzc2VzLFxuICAgICAgICAgIGRhdGVUb29sdGlwVGV4dHM6IHN0YXRlLmRhdGVUb29sdGlwVGV4dHMsXG4gICAgICAgICAgbW9udGhJbmRleFxuICAgICAgICB9KVxuICAgICk7XG5cbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUsIHsgZmxhZ2dlZE1vbnRocyB9KTtcbiAgfVxuXG4gIGlmIChzdGF0ZS52aWV3Lm1vZGUgPT09ICdtb250aCcgJiYgc3RhdGUubW9udGhzQ2FsZW5kYXIpIHtcbiAgICBjb25zdCBmbGFnZ2VkTW9udGhzQ2FsZW5kYXIgPSBzdGF0ZS5tb250aHNDYWxlbmRhci5tYXAoXG4gICAgICAoZm9ybWF0dGVkTW9udGgsIG1vbnRoSW5kZXgpID0+XG4gICAgICAgIGZsYWdNb250aHNDYWxlbmRhcihmb3JtYXR0ZWRNb250aCwge1xuICAgICAgICAgIGlzRGlzYWJsZWQ6IHN0YXRlLmlzRGlzYWJsZWQsXG4gICAgICAgICAgbWluRGF0ZTogc3RhdGUubWluRGF0ZSxcbiAgICAgICAgICBtYXhEYXRlOiBzdGF0ZS5tYXhEYXRlLFxuICAgICAgICAgIGhvdmVyZWRNb250aDogc3RhdGUuaG92ZXJlZE1vbnRoLFxuICAgICAgICAgIHNlbGVjdGVkRGF0ZTogc3RhdGUuc2VsZWN0ZWREYXRlLFxuICAgICAgICAgIGRhdGVzRGlzYWJsZWQ6IHN0YXRlLmRhdGVzRGlzYWJsZWQsXG4gICAgICAgICAgZGF0ZXNFbmFibGVkOiBzdGF0ZS5kYXRlc0VuYWJsZWQsXG4gICAgICAgICAgc2VsZWN0ZWRSYW5nZTogc3RhdGUuc2VsZWN0ZWRSYW5nZSxcbiAgICAgICAgICBkaXNwbGF5TW9udGhzLFxuICAgICAgICAgIG1vbnRoSW5kZXhcbiAgICAgICAgfSlcbiAgICApO1xuXG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIHN0YXRlLCB7IGZsYWdnZWRNb250aHNDYWxlbmRhciB9KTtcbiAgfVxuXG4gIGlmIChzdGF0ZS52aWV3Lm1vZGUgPT09ICd5ZWFyJyAmJiBzdGF0ZS55ZWFyc0NhbGVuZGFyTW9kZWwpIHtcbiAgICBjb25zdCB5ZWFyc0NhbGVuZGFyRmxhZ2dlZCA9IHN0YXRlLnllYXJzQ2FsZW5kYXJNb2RlbC5tYXAoXG4gICAgICAoZm9ybWF0dGVkTW9udGgsIHllYXJJbmRleCkgPT5cbiAgICAgICAgZmxhZ1llYXJzQ2FsZW5kYXIoZm9ybWF0dGVkTW9udGgsIHtcbiAgICAgICAgICBpc0Rpc2FibGVkOiBzdGF0ZS5pc0Rpc2FibGVkLFxuICAgICAgICAgIG1pbkRhdGU6IHN0YXRlLm1pbkRhdGUsXG4gICAgICAgICAgbWF4RGF0ZTogc3RhdGUubWF4RGF0ZSxcbiAgICAgICAgICBob3ZlcmVkWWVhcjogc3RhdGUuaG92ZXJlZFllYXIsXG4gICAgICAgICAgc2VsZWN0ZWREYXRlOiBzdGF0ZS5zZWxlY3RlZERhdGUsXG4gICAgICAgICAgZGF0ZXNEaXNhYmxlZDogc3RhdGUuZGF0ZXNEaXNhYmxlZCxcbiAgICAgICAgICBkYXRlc0VuYWJsZWQ6IHN0YXRlLmRhdGVzRW5hYmxlZCxcbiAgICAgICAgICBzZWxlY3RlZFJhbmdlOiBzdGF0ZS5zZWxlY3RlZFJhbmdlLFxuICAgICAgICAgIGRpc3BsYXlNb250aHMsXG4gICAgICAgICAgeWVhckluZGV4XG4gICAgICAgIH0pXG4gICAgKTtcblxuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBzdGF0ZSwgeyB5ZWFyc0NhbGVuZGFyRmxhZ2dlZCB9KTtcbiAgfVxuXG4gIHJldHVybiBzdGF0ZTtcbn1cblxuZnVuY3Rpb24gbmF2aWdhdGVPZmZzZXRSZWR1Y2VyKHN0YXRlOiBCc0RhdGVwaWNrZXJTdGF0ZSwgYWN0aW9uOiBBY3Rpb24pOiBCc0RhdGVwaWNrZXJTdGF0ZSB7XG4gIGlmICghc3RhdGUudmlldykge1xuICAgIHJldHVybiBzdGF0ZTtcbiAgfVxuXG4gIGNvbnN0IGRhdGUgPSBzaGlmdFZpZXdEYXRlKHN0YXRlLCBhY3Rpb24pO1xuICBpZiAoIWRhdGUpIHtcbiAgICByZXR1cm4gc3RhdGU7XG4gIH1cblxuICBjb25zdCBuZXdTdGF0ZToge3ZpZXc6IEJzRGF0ZXBpY2tlclZpZXdTdGF0ZX0gPSB7XG4gICAgdmlldzoge1xuICAgICAgbW9kZTogc3RhdGUudmlldy5tb2RlLFxuICAgICAgZGF0ZVxuICAgIH1cbiAgfTtcblxuICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUsIG5ld1N0YXRlKTtcbn1cblxuZnVuY3Rpb24gc2hpZnRWaWV3RGF0ZShzdGF0ZTogQnNEYXRlcGlja2VyU3RhdGUsIGFjdGlvbjogQWN0aW9uKTogRGF0ZSB8IHVuZGVmaW5lZCB7XG4gIGlmICghc3RhdGUudmlldykge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBpZiAoc3RhdGUudmlldy5tb2RlID09PSAneWVhcicgJiYgc3RhdGUubWluTW9kZSA9PT0gJ3llYXInKSB7XG4gICAgY29uc3QgaW5pdGlhbERhdGUgPSBnZXRZZWFyc0NhbGVuZGFySW5pdGlhbERhdGUoc3RhdGUsIDApO1xuICAgIGlmIChpbml0aWFsRGF0ZSkge1xuICAgICAgY29uc3QgbWlkZGxlRGF0ZSA9IHNoaWZ0RGF0ZShpbml0aWFsRGF0ZSwgeyB5ZWFyOiAtaW5pdGlhbFllYXJTaGlmdCB9KTtcbiAgICAgIHJldHVybiBzaGlmdERhdGUobWlkZGxlRGF0ZSwgYWN0aW9uLnBheWxvYWQpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBzaGlmdERhdGUoc3RhcnRPZihzdGF0ZS52aWV3LmRhdGUsICdtb250aCcpLCBhY3Rpb24ucGF5bG9hZCk7XG59XG5cbmZ1bmN0aW9uIGdldEZvcm1hdE9wdGlvbnMoc3RhdGU6IEJzRGF0ZXBpY2tlclN0YXRlKTogRGF0ZXBpY2tlckZvcm1hdE9wdGlvbnMge1xuICByZXR1cm4ge1xuICAgIGxvY2FsZTogc3RhdGUubG9jYWxlLFxuXG4gICAgbW9udGhUaXRsZTogc3RhdGUubW9udGhUaXRsZSxcbiAgICB5ZWFyVGl0bGU6IHN0YXRlLnllYXJUaXRsZSxcblxuICAgIGRheUxhYmVsOiBzdGF0ZS5kYXlMYWJlbCxcbiAgICBtb250aExhYmVsOiBzdGF0ZS5tb250aExhYmVsLFxuICAgIHllYXJMYWJlbDogc3RhdGUueWVhckxhYmVsLFxuXG4gICAgd2Vla051bWJlcnM6IHN0YXRlLndlZWtOdW1iZXJzXG4gIH07XG59XG5cbi8qKlxuICogaWYgdmlldyBkYXRlIGlzIHByb3ZpZGVkIChic1ZhbHVlfG5nTW9kZWwpIGl0IHNob3VsZCBiZSBzaG93blxuICogaWYgdmlldyBkYXRlIGlzIG5vdCBwcm92aWRlcjpcbiAqIGlmIG1pbkRhdGU+Y3VycmVudERhdGUgKGRlZmF1bHQgdmlldyB2YWx1ZSksIHNob3cgbWluRGF0ZVxuICogaWYgbWF4RGF0ZTxjdXJyZW50RGF0ZShkZWZhdWx0IHZpZXcgdmFsdWUpIHNob3cgbWF4RGF0ZVxuICovXG5mdW5jdGlvbiBnZXRWaWV3RGF0ZSh2aWV3RGF0ZTogRGF0ZSB8IERhdGVbXSwgbWluRGF0ZT86IERhdGUsIG1heERhdGU/OiBEYXRlKSB7XG4gIGNvbnN0IF9kYXRlID0gQXJyYXkuaXNBcnJheSh2aWV3RGF0ZSkgPyB2aWV3RGF0ZVswXSA6IHZpZXdEYXRlO1xuXG4gIGlmIChtaW5EYXRlICYmIGlzQWZ0ZXIobWluRGF0ZSwgX2RhdGUsICdkYXknKSkge1xuICAgIHJldHVybiBtaW5EYXRlO1xuICB9XG5cbiAgaWYgKG1heERhdGUgJiYgaXNCZWZvcmUobWF4RGF0ZSwgX2RhdGUsICdkYXknKSkge1xuICAgIHJldHVybiBtYXhEYXRlO1xuICB9XG5cbiAgcmV0dXJuIF9kYXRlO1xufVxuXG5mdW5jdGlvbiBpc0Rpc3BsYXlPbmVNb250aCh2aWV3RGF0ZTogRGF0ZSwgbWluRGF0ZT86IERhdGUsIG1heERhdGU/OiBEYXRlKSB7XG4gIGlmIChtYXhEYXRlICYmIGlzU2FtZShtYXhEYXRlLCB2aWV3RGF0ZSwgJ2RheScpKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZXR1cm4gbWluRGF0ZSAmJiBtYXhEYXRlICYmIG1pbkRhdGUuZ2V0TW9udGgoKSA9PT0gbWF4RGF0ZS5nZXRNb250aCgpO1xufVxuIl19