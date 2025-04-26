import { ChangeDetectorRef, Directive, ElementRef, EventEmitter, HostListener, Input, Output, Renderer2, TemplateRef, ViewContainerRef } from '@angular/core';
import { NgControl } from '@angular/forms';
import { ComponentLoaderFactory } from 'ngx-bootstrap/component-loader';
import { EMPTY, from, isObservable } from 'rxjs';
import { debounceTime, filter, mergeMap, switchMap, tap, toArray } from 'rxjs/operators';
import { TypeaheadContainerComponent } from './typeahead-container.component';
import { TypeaheadMatch } from './typeahead-match.class';
import { getValueFromObject, latinize, tokenize } from './typeahead-utils';
import { TypeaheadConfig } from './typeahead.config';
import { PositioningService } from 'ngx-bootstrap/positioning';
import * as i0 from "@angular/core";
import * as i1 from "ngx-bootstrap/component-loader";
import * as i2 from "./typeahead.config";
import * as i3 from "@angular/forms";
export class TypeaheadDirective {
    constructor(cis, config, changeDetection, element, ngControl, renderer, viewContainerRef) {
        this.changeDetection = changeDetection;
        this.element = element;
        this.ngControl = ngControl;
        this.renderer = renderer;
        /** minimal no of characters that needs to be entered before
         * typeahead kicks-in. When set to 0, typeahead shows on focus with full
         * list of options (limited as normal by typeaheadOptionsLimit)
         */
        this.typeaheadMinLength = 1;
        /** sets use adaptive position */
        this.adaptivePosition = false;
        /** turn on/off animation */
        this.isAnimated = false;
        /** minimal wait time after last character typed before typeahead kicks-in */
        this.typeaheadWaitMs = 0;
        /** match latin symbols.
         * If true the word súper would match super and vice versa.
         */
        this.typeaheadLatinize = true;
        /** Can be use to search words by inserting a single white space between each characters
         *  for example 'C a l i f o r n i a' will match 'California'.
         */
        this.typeaheadSingleWords = true;
        /** should be used only in case typeaheadSingleWords attribute is true.
         * Sets the word delimiter to break words. Defaults to space.
         */
        this.typeaheadWordDelimiters = ' ';
        /** should be used only in case typeaheadMultipleSearch attribute is true.
         * Sets the multiple search delimiter to know when to start a new search. Defaults to comma.
         * If space needs to be used, then explicitly set typeaheadWordDelimiters to something else than space
         * because space is used by default OR set typeaheadSingleWords attribute to false if you don't need
         * to use it together with multiple search.
         */
        this.typeaheadMultipleSearchDelimiters = ',';
        /** should be used only in case typeaheadSingleWords attribute is true.
         * Sets the word delimiter to match exact phrase.
         * Defaults to simple and double quotes.
         */
        this.typeaheadPhraseDelimiters = '\'"';
        /** specifies if typeahead is scrollable  */
        this.typeaheadScrollable = false;
        /** specifies number of options to show in scroll view  */
        this.typeaheadOptionsInScrollableView = 5;
        /** fired when an options list was opened and the user clicked Tab
         * If a value equal true, it will be chosen first or active item in the list
         * If value equal false, it will be chosen an active item in the list or nothing
         */
        this.typeaheadSelectFirstItem = true;
        /** makes active first item in a list */
        this.typeaheadIsFirstItemActive = true;
        /** fired when 'busy' state of this component was changed,
         * fired on async mode only, returns boolean
         */
        this.typeaheadLoading = new EventEmitter();
        /** fired on every key event and returns true
         * in case of matches are not detected
         */
        this.typeaheadNoResults = new EventEmitter();
        /** fired when option was selected, return object with data of this option. */
        this.typeaheadOnSelect = new EventEmitter();
        /** fired when option was previewed, return object with data of this option. */
        this.typeaheadOnPreview = new EventEmitter();
        /** fired when blur event occurs. returns the active item */
        this.typeaheadOnBlur = new EventEmitter();
        /** This attribute indicates that the dropdown should be opened upwards */
        this.dropup = false;
        this.isOpen = false;
        this.list = 'list';
        this.isActiveItemChanged = false;
        this.isFocused = false;
        this.cancelRequestOnFocusLost = false;
        this.selectItemOnBlur = false;
        this.keyUpEventEmitter = new EventEmitter();
        this.placement = 'bottom left';
        this._matches = [];
        this._subscriptions = [];
        this._outsideClickListener = () => void 0;
        this._typeahead = cis
            .createLoader(element, viewContainerRef, renderer)
            .provide({ provide: TypeaheadConfig, useValue: config });
        Object.assign(this, {
            typeaheadHideResultsOnBlur: config.hideResultsOnBlur,
            cancelRequestOnFocusLost: config.cancelRequestOnFocusLost,
            typeaheadSelectFirstItem: config.selectFirstItem,
            typeaheadIsFirstItemActive: config.isFirstItemActive,
            typeaheadMinLength: config.minLength,
            adaptivePosition: config.adaptivePosition,
            isAnimated: config.isAnimated,
            selectItemOnBlur: config.selectItemOnBlur
        });
    }
    get matches() {
        return this._matches;
    }
    ngOnInit() {
        this.typeaheadOptionsLimit = this.typeaheadOptionsLimit || 20;
        this.typeaheadMinLength = this.typeaheadMinLength === void 0 ? 1 : this.typeaheadMinLength;
        // async should be false in case of array
        if (this.typeaheadAsync === undefined && !isObservable(this.typeahead)) {
            this.typeaheadAsync = false;
        }
        if (isObservable(this.typeahead)) {
            this.typeaheadAsync = true;
        }
        if (this.typeaheadAsync) {
            this.asyncActions();
        }
        else {
            this.syncActions();
        }
        this.checkDelimitersConflict();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onInput(e) {
        // For `<input>`s, use the `value` property. For others that don't have a
        // `value` (such as `<span contenteditable="true">`), use either
        // `textContent` or `innerText` (depending on which one is supported, i.e.
        // Firefox or IE).
        const value = e.target.value !== undefined
            ? e.target.value
            : e.target.textContent !== undefined
                ? e.target.textContent
                : e.target.innerText;
        if (value != null && value.trim().length >= this.typeaheadMinLength) {
            this.typeaheadLoading.emit(true);
            this.keyUpEventEmitter.emit(e.target.value);
        }
        else {
            this.typeaheadLoading.emit(false);
            this.typeaheadNoResults.emit(false);
            this.hide();
        }
    }
    onChange(event) {
        if (this._container) {
            // esc
            if (event.keyCode === 27 || event.key === 'Escape') {
                this.hide();
                return;
            }
            // up
            if (event.keyCode === 38 || event.key === 'ArrowUp') {
                this.isActiveItemChanged = true;
                this._container.prevActiveMatch();
                return;
            }
            // down
            if (event.keyCode === 40 || event.key === 'ArrowDown') {
                this.isActiveItemChanged = true;
                this._container.nextActiveMatch();
                return;
            }
            // enter
            if (event.keyCode === 13 || event.key === 'Enter') {
                this._container.selectActiveMatch();
                return;
            }
        }
    }
    onFocus() {
        this.isFocused = true;
        // add setTimeout to fix issue #5251
        // to get and emit updated value if it's changed on focus
        setTimeout(() => {
            if (this.typeaheadMinLength === 0) {
                this.typeaheadLoading.emit(true);
                this.keyUpEventEmitter.emit(this.element.nativeElement.value || '');
            }
        }, 0);
    }
    onBlur() {
        this.isFocused = false;
        if (this._container && !this._container.isFocused) {
            this.typeaheadOnBlur.emit(this._container.active);
        }
        if (!this.container && this._matches?.length === 0) {
            this.typeaheadOnBlur.emit(new TypeaheadMatch(this.element.nativeElement.value, this.element.nativeElement.value, false));
        }
    }
    onKeydown(event) {
        // no container - no problems
        if (!this._container) {
            return;
        }
        if (event.keyCode === 9 || event.key === 'Tab') {
            this.onBlur();
        }
        if (event.keyCode === 9 || event.key === 'Tab' || event.keyCode === 13 || event.key === 'Enter') {
            event.preventDefault();
            if (this.typeaheadSelectFirstItem) {
                this._container.selectActiveMatch();
                return;
            }
            if (!this.typeaheadSelectFirstItem) {
                this._container.selectActiveMatch(this.isActiveItemChanged);
                this.isActiveItemChanged = false;
                this.hide();
            }
        }
    }
    changeModel(match) {
        if (!match) {
            return;
        }
        let valueStr;
        if (this.typeaheadMultipleSearch && this._allEnteredValue) {
            const tokens = this._allEnteredValue.split(new RegExp(`([${this.typeaheadMultipleSearchDelimiters}]+)`));
            this._allEnteredValue = tokens
                .slice(0, tokens.length - 1)
                .concat(match.value)
                .join('');
            valueStr = this._allEnteredValue;
        }
        else {
            valueStr = match.value;
        }
        this.ngControl.viewToModelUpdate(valueStr);
        this.ngControl.control?.setValue(valueStr);
        this.changeDetection.markForCheck();
        this.hide();
    }
    show() {
        this._typeahead
            .attach(TypeaheadContainerComponent)
            .to(this.container)
            .position({ attachment: `${this.dropup ? 'top' : 'bottom'} left` })
            .show({
            typeaheadRef: this,
            placement: this.placement,
            animation: false,
            dropup: this.dropup
        });
        this._outsideClickListener = this.renderer.listen('document', 'click', (event) => {
            if (this.typeaheadMinLength === 0 && this.element.nativeElement.contains(event.target)) {
                return;
            }
            if (!this.typeaheadHideResultsOnBlur || this.element.nativeElement.contains(event.target)) {
                return;
            }
            this.onOutsideClick();
        });
        if (!this._typeahead.instance || !this.ngControl.control) {
            return;
        }
        this._container = this._typeahead.instance;
        this._container.parent = this;
        // This improves the speed as it won't have to be done for each list item
        const normalizedQuery = (this.typeaheadLatinize ? latinize(this.ngControl.control.value) : this.ngControl.control.value)
            .toString()
            .toLowerCase();
        this._container.query = this.tokenizeQuery(normalizedQuery);
        this._container.matches = this._matches;
        this.element.nativeElement.focus();
        this._container.activeChangeEvent.subscribe((activeId) => {
            this.activeDescendant = activeId;
            this.changeDetection.markForCheck();
        });
        this.isOpen = true;
    }
    hide() {
        if (this._typeahead.isShown) {
            this._typeahead.hide();
            this._outsideClickListener();
            this._container = void 0;
            this.isOpen = false;
            this.changeDetection.markForCheck();
        }
        this.typeaheadOnPreview.emit();
    }
    onOutsideClick() {
        if (this._container && !this._container.isFocused) {
            this.hide();
        }
    }
    ngOnDestroy() {
        // clean up subscriptions
        for (const sub of this._subscriptions) {
            sub.unsubscribe();
        }
        this._typeahead.dispose();
    }
    asyncActions() {
        this._subscriptions.push(this.keyUpEventEmitter
            .pipe(debounceTime(this.typeaheadWaitMs), tap((value) => (this._allEnteredValue = value)), switchMap(() => {
            if (!this.typeahead) {
                return EMPTY;
            }
            return this.typeahead;
        }))
            .subscribe((matches) => {
            this.finalizeAsyncCall(matches);
        }));
    }
    syncActions() {
        this._subscriptions.push(this.keyUpEventEmitter
            .pipe(debounceTime(this.typeaheadWaitMs), mergeMap((value) => {
            this._allEnteredValue = value;
            const normalizedQuery = this.normalizeQuery(value);
            if (!this.typeahead) {
                return EMPTY;
            }
            const typeahead = isObservable(this.typeahead) ? this.typeahead : from(this.typeahead);
            return typeahead.pipe(filter((option) => {
                return !!option && this.testMatch(this.normalizeOption(option), normalizedQuery);
            }), toArray());
        }))
            .subscribe((matches) => {
            this.finalizeAsyncCall(matches);
        }));
    }
    normalizeOption(option) {
        const optionValue = getValueFromObject(option, this.typeaheadOptionField);
        const normalizedOption = this.typeaheadLatinize ? latinize(optionValue) : optionValue;
        return normalizedOption.toLowerCase();
    }
    tokenizeQuery(currentQuery) {
        let query = currentQuery;
        if (this.typeaheadMultipleSearch && this.typeaheadSingleWords) {
            if (!this.haveCommonCharacters(`${this.typeaheadPhraseDelimiters}${this.typeaheadWordDelimiters}`, this.typeaheadMultipleSearchDelimiters)) {
                // single words and multiple search delimiters are different, can be used together
                query = tokenize(query, this.typeaheadWordDelimiters, this.typeaheadPhraseDelimiters, this.typeaheadMultipleSearchDelimiters);
            }
        }
        else if (this.typeaheadSingleWords) {
            query = tokenize(query, this.typeaheadWordDelimiters, this.typeaheadPhraseDelimiters);
        }
        else {
            // multiple searches
            query = tokenize(query, void 0, void 0, this.typeaheadMultipleSearchDelimiters);
        }
        return query;
    }
    normalizeQuery(value) {
        // If singleWords, break model here to not be doing extra work on each iteration
        let normalizedQuery = (this.typeaheadLatinize ? latinize(value) : value)
            .toString()
            .toLowerCase();
        normalizedQuery = this.tokenizeQuery(normalizedQuery);
        return normalizedQuery;
    }
    testMatch(match, test) {
        let spaceLength;
        if (typeof test === 'object') {
            spaceLength = test.length;
            for (let i = 0; i < spaceLength; i += 1) {
                if (test[i].length > 0 && match.indexOf(test[i]) < 0) {
                    return false;
                }
            }
            return true;
        }
        return match.indexOf(test) >= 0;
    }
    finalizeAsyncCall(matches) {
        this.prepareMatches(matches || []);
        this.typeaheadLoading.emit(false);
        this.typeaheadNoResults.emit(!this.hasMatches());
        if (!this.hasMatches()) {
            this.hide();
            return;
        }
        if (!this.isFocused && this.cancelRequestOnFocusLost) {
            return;
        }
        if (this._container && this.ngControl.control) {
            // fix: remove usage of ngControl internals
            const _controlValue = (this.typeaheadLatinize ? latinize(this.ngControl.control.value) : this.ngControl.control.value) || '';
            // This improves the speed as it won't have to be done for each list item
            const normalizedQuery = _controlValue.toString().toLowerCase();
            this._container.query = this.tokenizeQuery(normalizedQuery);
            this._container.matches = this._matches;
        }
        else {
            this.show();
        }
    }
    prepareMatches(options) {
        const limited = options.slice(0, this.typeaheadOptionsLimit);
        const sorted = !this.typeaheadOrderBy ? limited : this.orderMatches(limited);
        if (this.typeaheadGroupField) {
            let matches = [];
            // extract all group names
            const groups = sorted
                .map((option) => getValueFromObject(option, this.typeaheadGroupField))
                .filter((v, i, a) => a.indexOf(v) === i);
            groups.forEach((group) => {
                // add group header to array of matches
                matches.push(new TypeaheadMatch(group, group, true));
                // add each item of group to array of matches
                matches = matches.concat(sorted
                    .filter((option) => getValueFromObject(option, this.typeaheadGroupField) === group)
                    .map((option) => new TypeaheadMatch(option, getValueFromObject(option, this.typeaheadOptionField))));
            });
            this._matches = matches;
        }
        else {
            this._matches = sorted.map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (option) => new TypeaheadMatch(option, getValueFromObject(option, this.typeaheadOptionField)));
        }
    }
    orderMatches(options) {
        if (!options.length) {
            return options;
        }
        if (this.typeaheadOrderBy !== null &&
            this.typeaheadOrderBy !== undefined &&
            typeof this.typeaheadOrderBy === 'object' &&
            Object.keys(this.typeaheadOrderBy).length === 0) {
            console.error('Field and direction properties for typeaheadOrderBy have to be set according to documentation!');
            return options;
        }
        const { field, direction } = this.typeaheadOrderBy || {};
        if (!direction || !(direction === 'asc' || direction === 'desc')) {
            console.error('typeaheadOrderBy direction has to equal "asc" or "desc". Please follow the documentation.');
            return options;
        }
        if (typeof options[0] === 'string') {
            return direction === 'asc' ? options.sort() : options.sort().reverse();
        }
        if (!field || typeof field !== 'string') {
            console.error('typeaheadOrderBy field has to set according to the documentation.');
            return options;
        }
        return options.sort((a, b) => {
            const stringA = getValueFromObject(a, field);
            const stringB = getValueFromObject(b, field);
            if (stringA < stringB) {
                return direction === 'asc' ? -1 : 1;
            }
            if (stringA > stringB) {
                return direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }
    hasMatches() {
        return this._matches.length > 0;
    }
    checkDelimitersConflict() {
        if (this.typeaheadMultipleSearch &&
            this.typeaheadSingleWords &&
            this.haveCommonCharacters(`${this.typeaheadPhraseDelimiters}${this.typeaheadWordDelimiters}`, this.typeaheadMultipleSearchDelimiters)) {
            throw new Error(`Delimiters used in typeaheadMultipleSearchDelimiters must be different
          from delimiters used in typeaheadWordDelimiters (current value: ${this.typeaheadWordDelimiters}) and
          typeaheadPhraseDelimiters (current value: ${this.typeaheadPhraseDelimiters}).
          Please refer to the documentation`);
        }
    }
    haveCommonCharacters(str1, str2) {
        for (let i = 0; i < str1.length; i++) {
            if (str1.charAt(i).indexOf(str2) > -1) {
                return true;
            }
        }
        return false;
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: TypeaheadDirective, deps: [{ token: i1.ComponentLoaderFactory }, { token: i2.TypeaheadConfig }, { token: i0.ChangeDetectorRef }, { token: i0.ElementRef }, { token: i3.NgControl }, { token: i0.Renderer2 }, { token: i0.ViewContainerRef }], target: i0.ɵɵFactoryTarget.Directive }); }
    static { this.ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "18.0.1", type: TypeaheadDirective, isStandalone: true, selector: "[typeahead]", inputs: { typeahead: "typeahead", typeaheadMinLength: "typeaheadMinLength", adaptivePosition: "adaptivePosition", isAnimated: "isAnimated", typeaheadWaitMs: "typeaheadWaitMs", typeaheadOptionsLimit: "typeaheadOptionsLimit", typeaheadOptionField: "typeaheadOptionField", typeaheadGroupField: "typeaheadGroupField", typeaheadOrderBy: "typeaheadOrderBy", typeaheadAsync: "typeaheadAsync", typeaheadLatinize: "typeaheadLatinize", typeaheadSingleWords: "typeaheadSingleWords", typeaheadWordDelimiters: "typeaheadWordDelimiters", typeaheadMultipleSearch: "typeaheadMultipleSearch", typeaheadMultipleSearchDelimiters: "typeaheadMultipleSearchDelimiters", typeaheadPhraseDelimiters: "typeaheadPhraseDelimiters", typeaheadItemTemplate: "typeaheadItemTemplate", optionsListTemplate: "optionsListTemplate", typeaheadScrollable: "typeaheadScrollable", typeaheadOptionsInScrollableView: "typeaheadOptionsInScrollableView", typeaheadHideResultsOnBlur: "typeaheadHideResultsOnBlur", typeaheadSelectFirstItem: "typeaheadSelectFirstItem", typeaheadIsFirstItemActive: "typeaheadIsFirstItemActive", container: "container", dropup: "dropup" }, outputs: { typeaheadLoading: "typeaheadLoading", typeaheadNoResults: "typeaheadNoResults", typeaheadOnSelect: "typeaheadOnSelect", typeaheadOnPreview: "typeaheadOnPreview", typeaheadOnBlur: "typeaheadOnBlur" }, host: { listeners: { "input": "onInput($event)", "keyup": "onChange($event)", "click": "onFocus()", "focus": "onFocus()", "blur": "onBlur()", "keydown": "onKeydown($event)" }, properties: { "attr.aria-activedescendant": "activeDescendant", "attr.aria-owns": "isOpen ? this._container.popupId : null", "attr.aria-expanded": "isOpen", "attr.aria-autocomplete": "list" } }, providers: [ComponentLoaderFactory, PositioningService], exportAs: ["bs-typeahead"], ngImport: i0 }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: TypeaheadDirective, decorators: [{
            type: Directive,
            args: [{
                    selector: '[typeahead]',
                    exportAs: 'bs-typeahead',
                    // eslint-disable-next-line @angular-eslint/no-host-metadata-property
                    host: {
                        '[attr.aria-activedescendant]': 'activeDescendant',
                        '[attr.aria-owns]': 'isOpen ? this._container.popupId : null',
                        '[attr.aria-expanded]': 'isOpen',
                        '[attr.aria-autocomplete]': 'list'
                    },
                    standalone: true,
                    providers: [ComponentLoaderFactory, PositioningService]
                }]
        }], ctorParameters: () => [{ type: i1.ComponentLoaderFactory }, { type: i2.TypeaheadConfig }, { type: i0.ChangeDetectorRef }, { type: i0.ElementRef }, { type: i3.NgControl }, { type: i0.Renderer2 }, { type: i0.ViewContainerRef }], propDecorators: { typeahead: [{
                type: Input
            }], typeaheadMinLength: [{
                type: Input
            }], adaptivePosition: [{
                type: Input
            }], isAnimated: [{
                type: Input
            }], typeaheadWaitMs: [{
                type: Input
            }], typeaheadOptionsLimit: [{
                type: Input
            }], typeaheadOptionField: [{
                type: Input
            }], typeaheadGroupField: [{
                type: Input
            }], typeaheadOrderBy: [{
                type: Input
            }], typeaheadAsync: [{
                type: Input
            }], typeaheadLatinize: [{
                type: Input
            }], typeaheadSingleWords: [{
                type: Input
            }], typeaheadWordDelimiters: [{
                type: Input
            }], typeaheadMultipleSearch: [{
                type: Input
            }], typeaheadMultipleSearchDelimiters: [{
                type: Input
            }], typeaheadPhraseDelimiters: [{
                type: Input
            }], typeaheadItemTemplate: [{
                type: Input
            }], optionsListTemplate: [{
                type: Input
            }], typeaheadScrollable: [{
                type: Input
            }], typeaheadOptionsInScrollableView: [{
                type: Input
            }], typeaheadHideResultsOnBlur: [{
                type: Input
            }], typeaheadSelectFirstItem: [{
                type: Input
            }], typeaheadIsFirstItemActive: [{
                type: Input
            }], typeaheadLoading: [{
                type: Output
            }], typeaheadNoResults: [{
                type: Output
            }], typeaheadOnSelect: [{
                type: Output
            }], typeaheadOnPreview: [{
                type: Output
            }], typeaheadOnBlur: [{
                type: Output
            }], container: [{
                type: Input
            }], dropup: [{
                type: Input
            }], 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onInput: [{
                type: HostListener,
                args: ['input', ['$event']]
            }], onChange: [{
                type: HostListener,
                args: ['keyup', ['$event']]
            }], onFocus: [{
                type: HostListener,
                args: ['click']
            }, {
                type: HostListener,
                args: ['focus']
            }], onBlur: [{
                type: HostListener,
                args: ['blur']
            }], onKeydown: [{
                type: HostListener,
                args: ['keydown', ['$event']]
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZWFoZWFkLmRpcmVjdGl2ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy90eXBlYWhlYWQvdHlwZWFoZWFkLmRpcmVjdGl2ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsaUJBQWlCLEVBQ2pCLFNBQVMsRUFDVCxVQUFVLEVBQ1YsWUFBWSxFQUNaLFlBQVksRUFDWixLQUFLLEVBR0wsTUFBTSxFQUNOLFNBQVMsRUFDVCxXQUFXLEVBQ1gsZ0JBQWdCLEVBQ2pCLE1BQU0sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUMzQyxPQUFPLEVBQW1CLHNCQUFzQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFekYsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUE0QixNQUFNLE1BQU0sQ0FBQztBQUMzRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUd6RixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFekQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUMzRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDckQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7Ozs7O0FBbUIvRCxNQUFNLE9BQU8sa0JBQWtCO0lBZ0o3QixZQUNFLEdBQTJCLEVBQzNCLE1BQXVCLEVBQ2YsZUFBa0MsRUFDbEMsT0FBbUIsRUFDbkIsU0FBb0IsRUFDcEIsUUFBbUIsRUFDM0IsZ0JBQWtDO1FBSjFCLG9CQUFlLEdB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O3NCQUEzQixNQUFNO2dCQUVHLGlCQUFpQjtzQkFBMUIsTUFBTTtnQkFFRyxrQkFBa0I7c0JBQTNCLE1BQU07Z0JBRUcsZUFBZTtzQkFBeEIsTUFBTTtnQkFLRSxTQUFTO3NCQUFqQixLQUFLO2dCQUdHLE1BQU07c0JBQWQsS0FBSzs7UUFzRk4sOERBQThEO1FBQzlELE9BQU87c0JBRk4sWUFBWTt1QkFBQyxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUM7Z0JBeUJqQyxRQUFRO3NCQURQLFlBQVk7dUJBQUMsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDO2dCQXFDakMsT0FBTztzQkFGTixZQUFZO3VCQUFDLE9BQU87O3NCQUNwQixZQUFZO3VCQUFDLE9BQU87Z0JBY3JCLE1BQU07c0JBREwsWUFBWTt1QkFBQyxNQUFNO2dCQWVwQixTQUFTO3NCQURSLFlBQVk7dUJBQUMsU0FBUyxFQUFFLENBQUMsUUFBUSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgQ2hhbmdlRGV0ZWN0b3JSZWYsXG4gIERpcmVjdGl2ZSxcbiAgRWxlbWVudFJlZixcbiAgRXZlbnRFbWl0dGVyLFxuICBIb3N0TGlzdGVuZXIsXG4gIElucHV0LFxuICBPbkRlc3Ryb3ksXG4gIE9uSW5pdCxcbiAgT3V0cHV0LFxuICBSZW5kZXJlcjIsXG4gIFRlbXBsYXRlUmVmLFxuICBWaWV3Q29udGFpbmVyUmVmXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgTmdDb250cm9sIH0gZnJvbSAnQGFuZ3VsYXIvZm9ybXMnO1xuaW1wb3J0IHsgQ29tcG9uZW50TG9hZGVyLCBDb21wb25lbnRMb2FkZXJGYWN0b3J5IH0gZnJvbSAnbmd4LWJvb3RzdHJhcC9jb21wb25lbnQtbG9hZGVyJztcblxuaW1wb3J0IHsgRU1QVFksIGZyb20sIGlzT2JzZXJ2YWJsZSwgT2JzZXJ2YWJsZSwgU3Vic2NyaXB0aW9uIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBkZWJvdW5jZVRpbWUsIGZpbHRlciwgbWVyZ2VNYXAsIHN3aXRjaE1hcCwgdGFwLCB0b0FycmF5IH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgVHlwZWFoZWFkT3B0aW9uSXRlbUNvbnRleHQsIFR5cGVhaGVhZE9wdGlvbkxpc3RDb250ZXh0IH0gZnJvbSAnLi9tb2RlbHMnO1xuXG5pbXBvcnQgeyBUeXBlYWhlYWRDb250YWluZXJDb21wb25lbnQgfSBmcm9tICcuL3R5cGVhaGVhZC1jb250YWluZXIuY29tcG9uZW50JztcbmltcG9ydCB7IFR5cGVhaGVhZE1hdGNoIH0gZnJvbSAnLi90eXBlYWhlYWQtbWF0Y2guY2xhc3MnO1xuaW1wb3J0IHsgVHlwZWFoZWFkT3JkZXIgfSBmcm9tICcuL3R5cGVhaGVhZC1vcmRlci5jbGFzcyc7XG5pbXBvcnQgeyBnZXRWYWx1ZUZyb21PYmplY3QsIGxhdGluaXplLCB0b2tlbml6ZSB9IGZyb20gJy4vdHlwZWFoZWFkLXV0aWxzJztcbmltcG9ydCB7IFR5cGVhaGVhZENvbmZpZyB9IGZyb20gJy4vdHlwZWFoZWFkLmNvbmZpZyc7XG5pbXBvcnQgeyBQb3NpdGlvbmluZ1NlcnZpY2UgfSBmcm9tICduZ3gtYm9vdHN0cmFwL3Bvc2l0aW9uaW5nJztcblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lXG50eXBlIFR5cGVhaGVhZE9wdGlvbiA9IHN0cmluZyB8IFJlY29yZDxzdHJpbmcgfCBudW1iZXIsIGFueT47XG50eXBlIFR5cGVhaGVhZE9wdGlvbkFyciA9IFR5cGVhaGVhZE9wdGlvbltdIHwgT2JzZXJ2YWJsZTxUeXBlYWhlYWRPcHRpb24+O1xuXG5ARGlyZWN0aXZlKHtcbiAgICBzZWxlY3RvcjogJ1t0eXBlYWhlYWRdJyxcbiAgICBleHBvcnRBczogJ2JzLXR5cGVhaGVhZCcsXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEBhbmd1bGFyLWVzbGludC9uby1ob3N0LW1ldGFkYXRhLXByb3BlcnR5XG4gICAgaG9zdDoge1xuICAgICAgICAnW2F0dHIuYXJpYS1hY3RpdmVkZXNjZW5kYW50XSc6ICdhY3RpdmVEZXNjZW5kYW50JyxcbiAgICAgICAgJ1thdHRyLmFyaWEtb3duc10nOiAnaXNPcGVuID8gdGhpcy5fY29udGFpbmVyLnBvcHVwSWQgOiBudWxsJyxcbiAgICAgICAgJ1thdHRyLmFyaWEtZXhwYW5kZWRdJzogJ2lzT3BlbicsXG4gICAgICAgICdbYXR0ci5hcmlhLWF1dG9jb21wbGV0ZV0nOiAnbGlzdCdcbiAgICB9LFxuICAgIHN0YW5kYWxvbmU6IHRydWUsXG4gICAgcHJvdmlkZXJzOiBbQ29tcG9uZW50TG9hZGVyRmFjdG9yeSwgUG9zaXRpb25pbmdTZXJ2aWNlXVxufSlcbmV4cG9ydCBjbGFzcyBUeXBlYWhlYWREaXJlY3RpdmUgaW1wbGVtZW50cyBPbkluaXQsIE9uRGVzdHJveSB7XG4gIC8qKiBvcHRpb25zIHNvdXJjZSwgY2FuIGJlIEFycmF5IG9mIHN0cmluZ3MsIG9iamVjdHMgb3JcbiAgICogYW4gT2JzZXJ2YWJsZSBmb3IgZXh0ZXJuYWwgbWF0Y2hpbmcgcHJvY2Vzc1xuICAgKi9cbiAgQElucHV0KCkgdHlwZWFoZWFkPzogVHlwZWFoZWFkT3B0aW9uQXJyO1xuICAvKiogbWluaW1hbCBubyBvZiBjaGFyYWN0ZXJzIHRoYXQgbmVlZHMgdG8gYmUgZW50ZXJlZCBiZWZvcmVcbiAgICogdHlwZWFoZWFkIGtpY2tzLWluLiBXaGVuIHNldCB0byAwLCB0eXBlYWhlYWQgc2hvd3Mgb24gZm9jdXMgd2l0aCBmdWxsXG4gICAqIGxpc3Qgb2Ygb3B0aW9ucyAobGltaXRlZCBhcyBub3JtYWwgYnkgdHlwZWFoZWFkT3B0aW9uc0xpbWl0KVxuICAgKi9cbiAgQElucHV0KCkgdHlwZWFoZWFkTWluTGVuZ3RoID0gMTtcbiAgLyoqIHNldHMgdXNlIGFkYXB0aXZlIHBvc2l0aW9uICovXG4gIEBJbnB1dCgpIGFkYXB0aXZlUG9zaXRpb24gPSBmYWxzZTtcbiAgLyoqIHR1cm4gb24vb2ZmIGFuaW1hdGlvbiAqL1xuICBASW5wdXQoKSBpc0FuaW1hdGVkID0gZmFsc2U7XG4gIC8qKiBtaW5pbWFsIHdhaXQgdGltZSBhZnRlciBsYXN0IGNoYXJhY3RlciB0eXBlZCBiZWZvcmUgdHlwZWFoZWFkIGtpY2tzLWluICovXG4gIEBJbnB1dCgpIHR5cGVhaGVhZFdhaXRNcyA9IDA7XG4gIC8qKiBtYXhpbXVtIGxlbmd0aCBvZiBvcHRpb25zIGl0ZW1zIGxpc3QuIFRoZSBkZWZhdWx0IHZhbHVlIGlzIDIwICovXG4gIEBJbnB1dCgpIHR5cGVhaGVhZE9wdGlvbnNMaW1pdD86IG51bWJlcjtcbiAgLyoqIHdoZW4gb3B0aW9ucyBzb3VyY2UgaXMgYW4gYXJyYXkgb2Ygb2JqZWN0cywgdGhlIG5hbWUgb2YgZmllbGRcbiAgICogdGhhdCBjb250YWlucyB0aGUgb3B0aW9ucyB2YWx1ZSwgd2UgdXNlIGFycmF5IGl0ZW0gYXMgb3B0aW9uIGluIGNhc2VcbiAgICogb2YgdGhpcyBmaWVsZCBpcyBtaXNzaW5nLiBTdXBwb3J0cyBuZXN0ZWQgcHJvcGVydGllcyBhbmQgbWV0aG9kcy5cbiAgICovXG4gIEBJbnB1dCgpIHR5cGVhaGVhZE9wdGlvbkZpZWxkPzogc3RyaW5nO1xuICAvKiogd2hlbiBvcHRpb25zIHNvdXJjZSBpcyBhbiBhcnJheSBvZiBvYmplY3RzLCB0aGUgbmFtZSBvZiBmaWVsZCB0aGF0XG4gICAqIGNvbnRhaW5zIHRoZSBncm91cCB2YWx1ZSwgbWF0Y2hlcyBhcmUgZ3JvdXBlZCBieSB0aGlzIGZpZWxkIHdoZW4gc2V0LlxuICAgKi9cbiAgQElucHV0KCkgdHlwZWFoZWFkR3JvdXBGaWVsZD86IHN0cmluZztcbiAgLyoqIFVzZWQgdG8gc3BlY2lmeSBhIGN1c3RvbSBvcmRlciBvZiBtYXRjaGVzLiBXaGVuIG9wdGlvbnMgc291cmNlIGlzIGFuIGFycmF5IG9mIG9iamVjdHNcbiAgICogYSBmaWVsZCBmb3Igc29ydGluZyBoYXMgdG8gYmUgc2V0IHVwLiBJbiBjYXNlIG9mIG9wdGlvbnMgc291cmNlIGlzIGFuIGFycmF5IG9mIHN0cmluZyxcbiAgICogYSBmaWVsZCBmb3Igc29ydGluZyBpcyBhYnNlbnQuIFRoZSBvcmRlcmluZyBkaXJlY3Rpb24gY291bGQgYmUgY2hhbmdlZCB0byBhc2NlbmRpbmcgb3IgZGVzY2VuZGluZy5cbiAgICovXG4gIEBJbnB1dCgpIHR5cGVhaGVhZE9yZGVyQnk/OiBUeXBlYWhlYWRPcmRlcjtcbiAgLyoqIHNob3VsZCBiZSB1c2VkIG9ubHkgaW4gY2FzZSBvZiB0eXBlYWhlYWQgYXR0cmlidXRlIGlzIE9ic2VydmFibGUgb2YgYXJyYXkuXG4gICAqIElmIHRydWUgLSBsb2FkaW5nIG9mIG9wdGlvbnMgd2lsbCBiZSBhc3luYywgb3RoZXJ3aXNlIC0gc3luYy5cbiAgICogdHJ1ZSBtYWtlIHNlbnNlIGlmIG9wdGlvbnMgYXJyYXkgaXMgbGFyZ2UuXG4gICAqL1xuICBASW5wdXQoKSB0eXBlYWhlYWRBc3luYz86IGJvb2xlYW47XG4gIC8qKiBtYXRjaCBsYXRpbiBzeW1ib2xzLlxuICAgKiBJZiB0cnVlIHRoZSB3b3JkIHPDunBlciB3b3VsZCBtYXRjaCBzdXBlciBhbmQgdmljZSB2ZXJzYS5cbiAgICovXG4gIEBJbnB1dCgpIHR5cGVhaGVhZExhdGluaXplID0gdHJ1ZTtcbiAgLyoqIENhbiBiZSB1c2UgdG8gc2VhcmNoIHdvcmRzIGJ5IGluc2VydGluZyBhIHNpbmdsZSB3aGl0ZSBzcGFjZSBiZXR3ZWVuIGVhY2ggY2hhcmFjdGVyc1xuICAgKiAgZm9yIGV4YW1wbGUgJ0MgYSBsIGkgZiBvIHIgbiBpIGEnIHdpbGwgbWF0Y2ggJ0NhbGlmb3JuaWEnLlxuICAgKi9cbiAgQElucHV0KCkgdHlwZWFoZWFkU2luZ2xlV29yZHMgPSB0cnVlO1xuICAvKiogc2hvdWxkIGJlIHVzZWQgb25seSBpbiBjYXNlIHR5cGVhaGVhZFNpbmdsZVdvcmRzIGF0dHJpYnV0ZSBpcyB0cnVlLlxuICAgKiBTZXRzIHRoZSB3b3JkIGRlbGltaXRlciB0byBicmVhayB3b3Jkcy4gRGVmYXVsdHMgdG8gc3BhY2UuXG4gICAqL1xuICBASW5wdXQoKSB0eXBlYWhlYWRXb3JkRGVsaW1pdGVycyA9ICcgJztcbiAgLyoqIENhbiBiZSB1c2VkIHRvIGNvbmR1Y3QgYSBzZWFyY2ggb2YgbXVsdGlwbGUgaXRlbXMgYW5kIGhhdmUgc3VnZ2VzdGlvbiBub3QgZm9yIHRoZVxuICAgKiB3aG9sZSB2YWx1ZSBvZiB0aGUgaW5wdXQgYnV0IGZvciB0aGUgdmFsdWUgdGhhdCBjb21lcyBhZnRlciBhIGRlbGltaXRlciBwcm92aWRlZCB2aWFcbiAgICogdHlwZWFoZWFkTXVsdGlwbGVTZWFyY2hEZWxpbWl0ZXJzIGF0dHJpYnV0ZS4gVGhpcyBvcHRpb24gY2FuIG9ubHkgYmUgdXNlZCB0b2dldGhlciB3aXRoXG4gICAqIHR5cGVhaGVhZFNpbmdsZVdvcmRzIG9wdGlvbiBpZiB0eXBlYWhlYWRXb3JkRGVsaW1pdGVycyBhbmQgdHlwZWFoZWFkUGhyYXNlRGVsaW1pdGVyc1xuICAgKiBhcmUgZGlmZmVyZW50IGZyb20gdHlwZWFoZWFkTXVsdGlwbGVTZWFyY2hEZWxpbWl0ZXJzIHRvIGF2b2lkIGNvbmZsaWN0IGluIGRldGVybWluaW5nXG4gICAqIHdoZW4gdG8gZGVsaW1pdCBtdWx0aXBsZSBzZWFyY2hlcyBhbmQgd2hlbiBhIHNpbmdsZSB3b3JkLlxuICAgKi9cbiAgQElucHV0KCkgdHlwZWFoZWFkTXVsdGlwbGVTZWFyY2g/OiBib29sZWFuO1xuICAvKiogc2hvdWxkIGJlIHVzZWQgb25seSBpbiBjYXNlIHR5cGVhaGVhZE11bHRpcGxlU2VhcmNoIGF0dHJpYnV0ZSBpcyB0cnVlLlxuICAgKiBTZXRzIHRoZSBtdWx0aXBsZSBzZWFyY2ggZGVsaW1pdGVyIHRvIGtub3cgd2hlbiB0byBzdGFydCBhIG5ldyBzZWFyY2guIERlZmF1bHRzIHRvIGNvbW1hLlxuICAgKiBJZiBzcGFjZSBuZWVkcyB0byBiZSB1c2VkLCB0aGVuIGV4cGxpY2l0bHkgc2V0IHR5cGVhaGVhZFdvcmREZWxpbWl0ZXJzIHRvIHNvbWV0aGluZyBlbHNlIHRoYW4gc3BhY2VcbiAgICogYmVjYXVzZSBzcGFjZSBpcyB1c2VkIGJ5IGRlZmF1bHQgT1Igc2V0IHR5cGVhaGVhZFNpbmdsZVdvcmRzIGF0dHJpYnV0ZSB0byBmYWxzZSBpZiB5b3UgZG9uJ3QgbmVlZFxuICAgKiB0byB1c2UgaXQgdG9nZXRoZXIgd2l0aCBtdWx0aXBsZSBzZWFyY2guXG4gICAqL1xuICBASW5wdXQoKSB0eXBlYWhlYWRNdWx0aXBsZVNlYXJjaERlbGltaXRlcnMgPSAnLCc7XG4gIC8qKiBzaG91bGQgYmUgdXNlZCBvbmx5IGluIGNhc2UgdHlwZWFoZWFkU2luZ2xlV29yZHMgYXR0cmlidXRlIGlzIHRydWUuXG4gICAqIFNldHMgdGhlIHdvcmQgZGVsaW1pdGVyIHRvIG1hdGNoIGV4YWN0IHBocmFzZS5cbiAgICogRGVmYXVsdHMgdG8gc2ltcGxlIGFuZCBkb3VibGUgcXVvdGVzLlxuICAgKi9cbiAgQElucHV0KCkgdHlwZWFoZWFkUGhyYXNlRGVsaW1pdGVycyA9ICdcXCdcIic7XG4gIC8qKiB1c2VkIHRvIHNwZWNpZnkgYSBjdXN0b20gaXRlbSB0ZW1wbGF0ZS5cbiAgICogVGVtcGxhdGUgdmFyaWFibGVzIGV4cG9zZWQgYXJlIGNhbGxlZCBpdGVtIGFuZCBpbmRleDtcbiAgICovXG4gIEBJbnB1dCgpIHR5cGVhaGVhZEl0ZW1UZW1wbGF0ZT86IFRlbXBsYXRlUmVmPFR5cGVhaGVhZE9wdGlvbkl0ZW1Db250ZXh0PjtcbiAgLyoqIHVzZWQgdG8gc3BlY2lmeSBhIGN1c3RvbSBvcHRpb25zIGxpc3QgdGVtcGxhdGUuXG4gICAqIFRlbXBsYXRlIHZhcmlhYmxlczogbWF0Y2hlcywgaXRlbVRlbXBsYXRlLCBxdWVyeVxuICAgKi9cbiAgQElucHV0KCkgb3B0aW9uc0xpc3RUZW1wbGF0ZT86IFRlbXBsYXRlUmVmPFR5cGVhaGVhZE9wdGlvbkxpc3RDb250ZXh0PjtcbiAgLyoqIHNwZWNpZmllcyBpZiB0eXBlYWhlYWQgaXMgc2Nyb2xsYWJsZSAgKi9cbiAgQElucHV0KCkgdHlwZWFoZWFkU2Nyb2xsYWJsZSA9IGZhbHNlO1xuICAvKiogc3BlY2lmaWVzIG51bWJlciBvZiBvcHRpb25zIHRvIHNob3cgaW4gc2Nyb2xsIHZpZXcgICovXG4gIEBJbnB1dCgpIHR5cGVhaGVhZE9wdGlvbnNJblNjcm9sbGFibGVWaWV3ID0gNTtcbiAgLyoqIHVzZWQgdG8gaGlkZSByZXN1bHQgb24gYmx1ciAqL1xuICBASW5wdXQoKSB0eXBlYWhlYWRIaWRlUmVzdWx0c09uQmx1cj86IGJvb2xlYW47XG4gIC8qKiBmaXJlZCB3aGVuIGFuIG9wdGlvbnMgbGlzdCB3YXMgb3BlbmVkIGFuZCB0aGUgdXNlciBjbGlja2VkIFRhYlxuICAgKiBJZiBhIHZhbHVlIGVxdWFsIHRydWUsIGl0IHdpbGwgYmUgY2hvc2VuIGZpcnN0IG9yIGFjdGl2ZSBpdGVtIGluIHRoZSBsaXN0XG4gICAqIElmIHZhbHVlIGVxdWFsIGZhbHNlLCBpdCB3aWxsIGJlIGNob3NlbiBhbiBhY3RpdmUgaXRlbSBpbiB0aGUgbGlzdCBvciBub3RoaW5nXG4gICAqL1xuICBASW5wdXQoKSB0eXBlYWhlYWRTZWxlY3RGaXJzdEl0ZW0gPSB0cnVlO1xuICAvKiogbWFrZXMgYWN0aXZlIGZpcnN0IGl0ZW0gaW4gYSBsaXN0ICovXG4gIEBJbnB1dCgpIHR5cGVhaGVhZElzRmlyc3RJdGVtQWN0aXZlID0gdHJ1ZTtcbiAgLyoqIGZpcmVkIHdoZW4gJ2J1c3knIHN0YXRlIG9mIHRoaXMgY29tcG9uZW50IHdhcyBjaGFuZ2VkLFxuICAgKiBmaXJlZCBvbiBhc3luYyBtb2RlIG9ubHksIHJldHVybnMgYm9vbGVhblxuICAgKi9cbiAgQE91dHB1dCgpIHR5cGVhaGVhZExvYWRpbmcgPSBuZXcgRXZlbnRFbWl0dGVyPGJvb2xlYW4+KCk7XG4gIC8qKiBmaXJlZCBvbiBldmVyeSBrZXkgZXZlbnQgYW5kIHJldHVybnMgdHJ1ZVxuICAgKiBpbiBjYXNlIG9mIG1hdGNoZXMgYXJlIG5vdCBkZXRlY3RlZFxuICAgKi9cbiAgQE91dHB1dCgpIHR5cGVhaGVhZE5vUmVzdWx0cyA9IG5ldyBFdmVudEVtaXR0ZXI8Ym9vbGVhbj4oKTtcbiAgLyoqIGZpcmVkIHdoZW4gb3B0aW9uIHdhcyBzZWxlY3RlZCwgcmV0dXJuIG9iamVjdCB3aXRoIGRhdGEgb2YgdGhpcyBvcHRpb24uICovXG4gIEBPdXRwdXQoKSB0eXBlYWhlYWRPblNlbGVjdCA9IG5ldyBFdmVudEVtaXR0ZXI8VHlwZWFoZWFkTWF0Y2g+KCk7XG4gIC8qKiBmaXJlZCB3aGVuIG9wdGlvbiB3YXMgcHJldmlld2VkLCByZXR1cm4gb2JqZWN0IHdpdGggZGF0YSBvZiB0aGlzIG9wdGlvbi4gKi9cbiAgQE91dHB1dCgpIHR5cGVhaGVhZE9uUHJldmlldyA9IG5ldyBFdmVudEVtaXR0ZXI8VHlwZWFoZWFkTWF0Y2g+KCk7XG4gIC8qKiBmaXJlZCB3aGVuIGJsdXIgZXZlbnQgb2NjdXJzLiByZXR1cm5zIHRoZSBhY3RpdmUgaXRlbSAqL1xuICBAT3V0cHV0KCkgdHlwZWFoZWFkT25CbHVyID0gbmV3IEV2ZW50RW1pdHRlcjxUeXBlYWhlYWRNYXRjaCB8IHVuZGVmaW5lZD4oKTtcblxuICAvKipcbiAgICogQSBzZWxlY3RvciBzcGVjaWZ5aW5nIHRoZSBlbGVtZW50IHRoZSB0eXBlYWhlYWQgc2hvdWxkIGJlIGFwcGVuZGVkIHRvLlxuICAgKi9cbiAgQElucHV0KCkgY29udGFpbmVyPzogc3RyaW5nO1xuXG4gIC8qKiBUaGlzIGF0dHJpYnV0ZSBpbmRpY2F0ZXMgdGhhdCB0aGUgZHJvcGRvd24gc2hvdWxkIGJlIG9wZW5lZCB1cHdhcmRzICovXG4gIEBJbnB1dCgpIGRyb3B1cCA9IGZhbHNlO1xuXG4gIC8vIG5vdCB5ZXQgaW1wbGVtZW50ZWRcbiAgLyoqIGlmIGZhbHNlIHJlc3RyaWN0IG1vZGVsIHZhbHVlcyB0byB0aGUgb25lcyBzZWxlY3RlZCBmcm9tIHRoZSBwb3B1cCBvbmx5IHdpbGwgYmUgcHJvdmlkZWQgKi9cbiAgLy8gQElucHV0KCkgcHJvdGVjdGVkIHR5cGVhaGVhZEVkaXRhYmxlOmJvb2xlYW47XG4gIC8qKiBpZiBmYWxzZSB0aGUgZmlyc3QgbWF0Y2ggYXV0b21hdGljYWxseSB3aWxsIG5vdCBiZSBmb2N1c2VkIGFzIHlvdSB0eXBlICovXG4gIC8vIEBJbnB1dCgpIHByb3RlY3RlZCB0eXBlYWhlYWRGb2N1c0ZpcnN0OmJvb2xlYW47XG4gIC8qKiBmb3JtYXQgdGhlIG5nLW1vZGVsIHJlc3VsdCBhZnRlciBzZWxlY3Rpb24gKi9cbiAgLy8gQElucHV0KCkgcHJvdGVjdGVkIHR5cGVhaGVhZElucHV0Rm9ybWF0dGVyOmFueTtcbiAgLyoqIGlmIHRydWUgYXV0b21hdGljYWxseSBzZWxlY3QgYW4gaXRlbSB3aGVuIHRoZXJlIGlzIG9uZSBvcHRpb24gdGhhdCBleGFjdGx5IG1hdGNoZXMgdGhlIHVzZXIgaW5wdXQgKi9cbiAgLy8gQElucHV0KCkgcHJvdGVjdGVkIHR5cGVhaGVhZFNlbGVjdE9uRXhhY3Q6Ym9vbGVhbjtcbiAgLyoqICBpZiB0cnVlIHNlbGVjdCB0aGUgY3VycmVudGx5IGhpZ2hsaWdodGVkIG1hdGNoIG9uIGJsdXIgKi9cbiAgLy8gQElucHV0KCkgcHJvdGVjdGVkIHR5cGVhaGVhZFNlbGVjdE9uQmx1cjpib29sZWFuO1xuICAvKiogIGlmIGZhbHNlIGRvbid0IGZvY3VzIHRoZSBpbnB1dCBlbGVtZW50IHRoZSB0eXBlYWhlYWQgZGlyZWN0aXZlIGlzIGFzc29jaWF0ZWQgd2l0aCBvbiBzZWxlY3Rpb24gKi9cbiAgLy8gQElucHV0KCkgcHJvdGVjdGVkIHR5cGVhaGVhZEZvY3VzT25TZWxlY3Q6Ym9vbGVhbjtcblxuICBhY3RpdmVEZXNjZW5kYW50Pzogc3RyaW5nO1xuICBpc09wZW4gPSBmYWxzZTtcbiAgbGlzdCA9ICdsaXN0JztcbiAgX2NvbnRhaW5lcj86IFR5cGVhaGVhZENvbnRhaW5lckNvbXBvbmVudDtcbiAgaXNBY3RpdmVJdGVtQ2hhbmdlZCA9IGZhbHNlO1xuICBpc0ZvY3VzZWQgPSBmYWxzZTtcbiAgY2FuY2VsUmVxdWVzdE9uRm9jdXNMb3N0ID0gZmFsc2U7XG4gIHNlbGVjdEl0ZW1PbkJsdXIgPSBmYWxzZTtcbiAgcHJvdGVjdGVkIGtleVVwRXZlbnRFbWl0dGVyID0gbmV3IEV2ZW50RW1pdHRlcjxzdHJpbmc+KCk7XG4gIHByb3RlY3RlZCBwbGFjZW1lbnQgPSAnYm90dG9tIGxlZnQnO1xuICBwcm90ZWN0ZWQgX21hdGNoZXM6IFR5cGVhaGVhZE1hdGNoW10gPSBbXTtcblxuICBwcml2YXRlIF90eXBlYWhlYWQ6IENvbXBvbmVudExvYWRlcjxUeXBlYWhlYWRDb250YWluZXJDb21wb25lbnQ+O1xuICBwcml2YXRlIF9zdWJzY3JpcHRpb25zOiBTdWJzY3JpcHRpb25bXSA9IFtdO1xuICBwcml2YXRlIF9hbGxFbnRlcmVkVmFsdWU/OiBzdHJpbmc7XG4gIHByaXZhdGUgX291dHNpZGVDbGlja0xpc3RlbmVyOiAoKSA9PiB2b2lkID0gKCkgPT4gdm9pZCAwO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGNpczogQ29tcG9uZW50TG9hZGVyRmFjdG9yeSxcbiAgICBjb25maWc6IFR5cGVhaGVhZENvbmZpZyxcbiAgICBwcml2YXRlIGNoYW5nZURldGVjdGlvbjogQ2hhbmdlRGV0ZWN0b3JSZWYsXG4gICAgcHJpdmF0ZSBlbGVtZW50OiBFbGVtZW50UmVmLFxuICAgIHByaXZhdGUgbmdDb250cm9sOiBOZ0NvbnRyb2wsXG4gICAgcHJpdmF0ZSByZW5kZXJlcjogUmVuZGVyZXIyLFxuICAgIHZpZXdDb250YWluZXJSZWY6IFZpZXdDb250YWluZXJSZWZcbiAgKSB7XG4gICAgdGhpcy5fdHlwZWFoZWFkID0gY2lzXG4gICAgICAuY3JlYXRlTG9hZGVyPFR5cGVhaGVhZENvbnRhaW5lckNvbXBvbmVudD4oZWxlbWVudCwgdmlld0NvbnRhaW5lclJlZiwgcmVuZGVyZXIpXG4gICAgICAucHJvdmlkZSh7IHByb3ZpZGU6IFR5cGVhaGVhZENvbmZpZywgdXNlVmFsdWU6IGNvbmZpZyB9KTtcblxuICAgIE9iamVjdC5hc3NpZ24odGhpcywge1xuICAgICAgdHlwZWFoZWFkSGlkZVJlc3VsdHNPbkJsdXI6IGNvbmZpZy5oaWRlUmVzdWx0c09uQmx1cixcbiAgICAgIGNhbmNlbFJlcXVlc3RPbkZvY3VzTG9zdDogY29uZmlnLmNhbmNlbFJlcXVlc3RPbkZvY3VzTG9zdCxcbiAgICAgIHR5cGVhaGVhZFNlbGVjdEZpcnN0SXRlbTogY29uZmlnLnNlbGVjdEZpcnN0SXRlbSxcbiAgICAgIHR5cGVhaGVhZElzRmlyc3RJdGVtQWN0aXZlOiBjb25maWcuaXNGaXJzdEl0ZW1BY3RpdmUsXG4gICAgICB0eXBlYWhlYWRNaW5MZW5ndGg6IGNvbmZpZy5taW5MZW5ndGgsXG4gICAgICBhZGFwdGl2ZVBvc2l0aW9uOiBjb25maWcuYWRhcHRpdmVQb3NpdGlvbixcbiAgICAgIGlzQW5pbWF0ZWQ6IGNvbmZpZy5pc0FuaW1hdGVkLFxuICAgICAgc2VsZWN0SXRlbU9uQmx1cjogY29uZmlnLnNlbGVjdEl0ZW1PbkJsdXJcbiAgICB9KTtcbiAgfVxuXG4gIGdldCBtYXRjaGVzKCk6IFR5cGVhaGVhZE1hdGNoW10ge1xuICAgIHJldHVybiB0aGlzLl9tYXRjaGVzO1xuICB9XG5cbiAgbmdPbkluaXQoKTogdm9pZCB7XG4gICAgdGhpcy50eXBlYWhlYWRPcHRpb25zTGltaXQgPSB0aGlzLnR5cGVhaGVhZE9wdGlvbnNMaW1pdCB8fCAyMDtcblxuICAgIHRoaXMudHlwZWFoZWFkTWluTGVuZ3RoID0gdGhpcy50eXBlYWhlYWRNaW5MZW5ndGggPT09IHZvaWQgMCA/IDEgOiB0aGlzLnR5cGVhaGVhZE1pbkxlbmd0aDtcblxuICAgIC8vIGFzeW5jIHNob3VsZCBiZSBmYWxzZSBpbiBjYXNlIG9mIGFycmF5XG4gICAgaWYgKHRoaXMudHlwZWFoZWFkQXN5bmMgPT09IHVuZGVmaW5lZCAmJiAhaXNPYnNlcnZhYmxlKHRoaXMudHlwZWFoZWFkKSkge1xuICAgICAgdGhpcy50eXBlYWhlYWRBc3luYyA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmIChpc09ic2VydmFibGUodGhpcy50eXBlYWhlYWQpKSB7XG4gICAgICB0aGlzLnR5cGVhaGVhZEFzeW5jID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy50eXBlYWhlYWRBc3luYykge1xuICAgICAgdGhpcy5hc3luY0FjdGlvbnMoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zeW5jQWN0aW9ucygpO1xuICAgIH1cblxuICAgIHRoaXMuY2hlY2tEZWxpbWl0ZXJzQ29uZmxpY3QoKTtcbiAgfVxuXG4gIEBIb3N0TGlzdGVuZXIoJ2lucHV0JywgWyckZXZlbnQnXSlcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgb25JbnB1dChlOiBhbnkpOiB2b2lkIHtcbiAgICAvLyBGb3IgYDxpbnB1dD5gcywgdXNlIHRoZSBgdmFsdWVgIHByb3BlcnR5LiBGb3Igb3RoZXJzIHRoYXQgZG9uJ3QgaGF2ZSBhXG4gICAgLy8gYHZhbHVlYCAoc3VjaCBhcyBgPHNwYW4gY29udGVudGVkaXRhYmxlPVwidHJ1ZVwiPmApLCB1c2UgZWl0aGVyXG4gICAgLy8gYHRleHRDb250ZW50YCBvciBgaW5uZXJUZXh0YCAoZGVwZW5kaW5nIG9uIHdoaWNoIG9uZSBpcyBzdXBwb3J0ZWQsIGkuZS5cbiAgICAvLyBGaXJlZm94IG9yIElFKS5cbiAgICBjb25zdCB2YWx1ZSA9XG4gICAgICBlLnRhcmdldC52YWx1ZSAhPT0gdW5kZWZpbmVkXG4gICAgICAgID8gZS50YXJnZXQudmFsdWVcbiAgICAgICAgOiBlLnRhcmdldC50ZXh0Q29udGVudCAhPT0gdW5kZWZpbmVkXG4gICAgICAgID8gZS50YXJnZXQudGV4dENvbnRlbnRcbiAgICAgICAgOiBlLnRhcmdldC5pbm5lclRleHQ7XG5cbiAgICBpZiAodmFsdWUgIT0gbnVsbCAmJiB2YWx1ZS50cmltKCkubGVuZ3RoID49IHRoaXMudHlwZWFoZWFkTWluTGVuZ3RoKSB7XG4gICAgICB0aGlzLnR5cGVhaGVhZExvYWRpbmcuZW1pdCh0cnVlKTtcbiAgICAgIHRoaXMua2V5VXBFdmVudEVtaXR0ZXIuZW1pdChlLnRhcmdldC52YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudHlwZWFoZWFkTG9hZGluZy5lbWl0KGZhbHNlKTtcbiAgICAgIHRoaXMudHlwZWFoZWFkTm9SZXN1bHRzLmVtaXQoZmFsc2UpO1xuICAgICAgdGhpcy5oaWRlKCk7XG4gICAgfVxuICB9XG5cbiAgQEhvc3RMaXN0ZW5lcigna2V5dXAnLCBbJyRldmVudCddKVxuICBvbkNoYW5nZShldmVudDogS2V5Ym9hcmRFdmVudCk6IHZvaWQge1xuICAgIGlmICh0aGlzLl9jb250YWluZXIpIHtcbiAgICAgIC8vIGVzY1xuICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDI3IHx8IGV2ZW50LmtleSA9PT0gJ0VzY2FwZScpIHtcbiAgICAgICAgdGhpcy5oaWRlKCk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyB1cFxuICAgICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDM4IHx8IGV2ZW50LmtleSA9PT0gJ0Fycm93VXAnKSB7XG4gICAgICAgIHRoaXMuaXNBY3RpdmVJdGVtQ2hhbmdlZCA9IHRydWU7XG4gICAgICAgIHRoaXMuX2NvbnRhaW5lci5wcmV2QWN0aXZlTWF0Y2goKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGRvd25cbiAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSA0MCB8fCBldmVudC5rZXkgPT09ICdBcnJvd0Rvd24nKSB7XG4gICAgICAgIHRoaXMuaXNBY3RpdmVJdGVtQ2hhbmdlZCA9IHRydWU7XG4gICAgICAgIHRoaXMuX2NvbnRhaW5lci5uZXh0QWN0aXZlTWF0Y2goKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGVudGVyXG4gICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMgfHwgZXZlbnQua2V5ID09PSAnRW50ZXInKSB7XG4gICAgICAgIHRoaXMuX2NvbnRhaW5lci5zZWxlY3RBY3RpdmVNYXRjaCgpO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBASG9zdExpc3RlbmVyKCdjbGljaycpXG4gIEBIb3N0TGlzdGVuZXIoJ2ZvY3VzJylcbiAgb25Gb2N1cygpOiB2b2lkIHtcbiAgICB0aGlzLmlzRm9jdXNlZCA9IHRydWU7XG4gICAgLy8gYWRkIHNldFRpbWVvdXQgdG8gZml4IGlzc3VlICM1MjUxXG4gICAgLy8gdG8gZ2V0IGFuZCBlbWl0IHVwZGF0ZWQgdmFsdWUgaWYgaXQncyBjaGFuZ2VkIG9uIGZvY3VzXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBpZiAodGhpcy50eXBlYWhlYWRNaW5MZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhpcy50eXBlYWhlYWRMb2FkaW5nLmVtaXQodHJ1ZSk7XG4gICAgICAgIHRoaXMua2V5VXBFdmVudEVtaXR0ZXIuZW1pdCh0aGlzLmVsZW1lbnQubmF0aXZlRWxlbWVudC52YWx1ZSB8fCAnJyk7XG4gICAgICB9XG4gICAgfSwgMCk7XG4gIH1cblxuICBASG9zdExpc3RlbmVyKCdibHVyJylcbiAgb25CbHVyKCk6IHZvaWQge1xuICAgIHRoaXMuaXNGb2N1c2VkID0gZmFsc2U7XG4gICAgaWYgKHRoaXMuX2NvbnRhaW5lciAmJiAhdGhpcy5fY29udGFpbmVyLmlzRm9jdXNlZCkge1xuICAgICAgdGhpcy50eXBlYWhlYWRPbkJsdXIuZW1pdCh0aGlzLl9jb250YWluZXIuYWN0aXZlKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuY29udGFpbmVyICYmIHRoaXMuX21hdGNoZXM/Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhpcy50eXBlYWhlYWRPbkJsdXIuZW1pdChcbiAgICAgICAgbmV3IFR5cGVhaGVhZE1hdGNoKHRoaXMuZWxlbWVudC5uYXRpdmVFbGVtZW50LnZhbHVlLCB0aGlzLmVsZW1lbnQubmF0aXZlRWxlbWVudC52YWx1ZSwgZmFsc2UpXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIEBIb3N0TGlzdGVuZXIoJ2tleWRvd24nLCBbJyRldmVudCddKVxuICBvbktleWRvd24oZXZlbnQ6IEtleWJvYXJkRXZlbnQpOiB2b2lkIHtcbiAgICAvLyBubyBjb250YWluZXIgLSBubyBwcm9ibGVtc1xuICAgIGlmICghdGhpcy5fY29udGFpbmVyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGV2ZW50LmtleUNvZGUgPT09IDkgfHwgZXZlbnQua2V5ID09PSAnVGFiJykge1xuICAgICAgdGhpcy5vbkJsdXIoKTtcbiAgICB9XG5cbiAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gOSB8fCBldmVudC5rZXkgPT09ICdUYWInIHx8IGV2ZW50LmtleUNvZGUgPT09IDEzIHx8IGV2ZW50LmtleSA9PT0gJ0VudGVyJykge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGlmICh0aGlzLnR5cGVhaGVhZFNlbGVjdEZpcnN0SXRlbSkge1xuICAgICAgICB0aGlzLl9jb250YWluZXIuc2VsZWN0QWN0aXZlTWF0Y2goKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICghdGhpcy50eXBlYWhlYWRTZWxlY3RGaXJzdEl0ZW0pIHtcbiAgICAgICAgdGhpcy5fY29udGFpbmVyLnNlbGVjdEFjdGl2ZU1hdGNoKHRoaXMuaXNBY3RpdmVJdGVtQ2hhbmdlZCk7XG4gICAgICAgIHRoaXMuaXNBY3RpdmVJdGVtQ2hhbmdlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmhpZGUoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBjaGFuZ2VNb2RlbChtYXRjaD86IFR5cGVhaGVhZE1hdGNoKTogdm9pZCB7XG4gICAgaWYgKCFtYXRjaCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsZXQgdmFsdWVTdHI6IHN0cmluZztcbiAgICBpZiAodGhpcy50eXBlYWhlYWRNdWx0aXBsZVNlYXJjaCAmJiB0aGlzLl9hbGxFbnRlcmVkVmFsdWUpIHtcbiAgICAgIGNvbnN0IHRva2VucyA9IHRoaXMuX2FsbEVudGVyZWRWYWx1ZS5zcGxpdChuZXcgUmVnRXhwKGAoWyR7dGhpcy50eXBlYWhlYWRNdWx0aXBsZVNlYXJjaERlbGltaXRlcnN9XSspYCkpO1xuICAgICAgdGhpcy5fYWxsRW50ZXJlZFZhbHVlID0gdG9rZW5zXG4gICAgICAgIC5zbGljZSgwLCB0b2tlbnMubGVuZ3RoIC0gMSlcbiAgICAgICAgLmNvbmNhdChtYXRjaC52YWx1ZSlcbiAgICAgICAgLmpvaW4oJycpO1xuICAgICAgdmFsdWVTdHIgPSB0aGlzLl9hbGxFbnRlcmVkVmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlU3RyID0gbWF0Y2gudmFsdWU7XG4gICAgfVxuICAgIHRoaXMubmdDb250cm9sLnZpZXdUb01vZGVsVXBkYXRlKHZhbHVlU3RyKTtcbiAgICB0aGlzLm5nQ29udHJvbC5jb250cm9sPy5zZXRWYWx1ZSh2YWx1ZVN0cik7XG4gICAgdGhpcy5jaGFuZ2VEZXRlY3Rpb24ubWFya0ZvckNoZWNrKCk7XG4gICAgdGhpcy5oaWRlKCk7XG4gIH1cblxuICBzaG93KCk6IHZvaWQge1xuICAgIHRoaXMuX3R5cGVhaGVhZFxuICAgICAgLmF0dGFjaChUeXBlYWhlYWRDb250YWluZXJDb21wb25lbnQpXG4gICAgICAudG8odGhpcy5jb250YWluZXIpXG4gICAgICAucG9zaXRpb24oeyBhdHRhY2htZW50OiBgJHt0aGlzLmRyb3B1cCA/ICd0b3AnIDogJ2JvdHRvbSd9IGxlZnRgIH0pXG4gICAgICAuc2hvdyh7XG4gICAgICAgIHR5cGVhaGVhZFJlZjogdGhpcyxcbiAgICAgICAgcGxhY2VtZW50OiB0aGlzLnBsYWNlbWVudCxcbiAgICAgICAgYW5pbWF0aW9uOiBmYWxzZSxcbiAgICAgICAgZHJvcHVwOiB0aGlzLmRyb3B1cFxuICAgICAgfSk7XG5cbiAgICB0aGlzLl9vdXRzaWRlQ2xpY2tMaXN0ZW5lciA9IHRoaXMucmVuZGVyZXIubGlzdGVuKCdkb2N1bWVudCcsICdjbGljaycsIChldmVudDogTW91c2VFdmVudCkgPT4ge1xuICAgICAgaWYgKHRoaXMudHlwZWFoZWFkTWluTGVuZ3RoID09PSAwICYmIHRoaXMuZWxlbWVudC5uYXRpdmVFbGVtZW50LmNvbnRhaW5zKGV2ZW50LnRhcmdldCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLnR5cGVhaGVhZEhpZGVSZXN1bHRzT25CbHVyIHx8IHRoaXMuZWxlbWVudC5uYXRpdmVFbGVtZW50LmNvbnRhaW5zKGV2ZW50LnRhcmdldCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy5vbk91dHNpZGVDbGljaygpO1xuICAgIH0pO1xuXG4gICAgaWYgKCF0aGlzLl90eXBlYWhlYWQuaW5zdGFuY2UgfHwgIXRoaXMubmdDb250cm9sLmNvbnRyb2wpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLl9jb250YWluZXIgPSB0aGlzLl90eXBlYWhlYWQuaW5zdGFuY2U7XG4gICAgdGhpcy5fY29udGFpbmVyLnBhcmVudCA9IHRoaXM7XG4gICAgLy8gVGhpcyBpbXByb3ZlcyB0aGUgc3BlZWQgYXMgaXQgd29uJ3QgaGF2ZSB0byBiZSBkb25lIGZvciBlYWNoIGxpc3QgaXRlbVxuXG4gICAgY29uc3Qgbm9ybWFsaXplZFF1ZXJ5ID0gKFxuICAgICAgdGhpcy50eXBlYWhlYWRMYXRpbml6ZSA/IGxhdGluaXplKHRoaXMubmdDb250cm9sLmNvbnRyb2wudmFsdWUpIDogdGhpcy5uZ0NvbnRyb2wuY29udHJvbC52YWx1ZVxuICAgIClcbiAgICAgIC50b1N0cmluZygpXG4gICAgICAudG9Mb3dlckNhc2UoKTtcblxuICAgIHRoaXMuX2NvbnRhaW5lci5xdWVyeSA9IHRoaXMudG9rZW5pemVRdWVyeShub3JtYWxpemVkUXVlcnkpO1xuXG4gICAgdGhpcy5fY29udGFpbmVyLm1hdGNoZXMgPSB0aGlzLl9tYXRjaGVzO1xuICAgIHRoaXMuZWxlbWVudC5uYXRpdmVFbGVtZW50LmZvY3VzKCk7XG5cbiAgICB0aGlzLl9jb250YWluZXIuYWN0aXZlQ2hhbmdlRXZlbnQuc3Vic2NyaWJlKChhY3RpdmVJZDogc3RyaW5nKSA9PiB7XG4gICAgICB0aGlzLmFjdGl2ZURlc2NlbmRhbnQgPSBhY3RpdmVJZDtcbiAgICAgIHRoaXMuY2hhbmdlRGV0ZWN0aW9uLm1hcmtGb3JDaGVjaygpO1xuICAgIH0pO1xuICAgIHRoaXMuaXNPcGVuID0gdHJ1ZTtcbiAgfVxuXG4gIGhpZGUoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuX3R5cGVhaGVhZC5pc1Nob3duKSB7XG4gICAgICB0aGlzLl90eXBlYWhlYWQuaGlkZSgpO1xuICAgICAgdGhpcy5fb3V0c2lkZUNsaWNrTGlzdGVuZXIoKTtcbiAgICAgIHRoaXMuX2NvbnRhaW5lciA9IHZvaWQgMDtcbiAgICAgIHRoaXMuaXNPcGVuID0gZmFsc2U7XG4gICAgICB0aGlzLmNoYW5nZURldGVjdGlvbi5tYXJrRm9yQ2hlY2soKTtcbiAgICB9XG4gICAgdGhpcy50eXBlYWhlYWRPblByZXZpZXcuZW1pdCgpO1xuICB9XG5cbiAgb25PdXRzaWRlQ2xpY2soKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuX2NvbnRhaW5lciAmJiAhdGhpcy5fY29udGFpbmVyLmlzRm9jdXNlZCkge1xuICAgICAgdGhpcy5oaWRlKCk7XG4gICAgfVxuICB9XG5cbiAgbmdPbkRlc3Ryb3koKSB7XG4gICAgLy8gY2xlYW4gdXAgc3Vic2NyaXB0aW9uc1xuICAgIGZvciAoY29uc3Qgc3ViIG9mIHRoaXMuX3N1YnNjcmlwdGlvbnMpIHtcbiAgICAgIHN1Yi51bnN1YnNjcmliZSgpO1xuICAgIH1cbiAgICB0aGlzLl90eXBlYWhlYWQuZGlzcG9zZSgpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jQWN0aW9ucygpOiB2b2lkIHtcbiAgICB0aGlzLl9zdWJzY3JpcHRpb25zLnB1c2goXG4gICAgICB0aGlzLmtleVVwRXZlbnRFbWl0dGVyXG4gICAgICAgIC5waXBlKFxuICAgICAgICAgIGRlYm91bmNlVGltZTxzdHJpbmc+KHRoaXMudHlwZWFoZWFkV2FpdE1zKSxcbiAgICAgICAgICB0YXAoKHZhbHVlKSA9PiAodGhpcy5fYWxsRW50ZXJlZFZhbHVlID0gdmFsdWUpKSxcbiAgICAgICAgICBzd2l0Y2hNYXAoKCkgPT4ge1xuICAgICAgICAgICAgaWYgKCF0aGlzLnR5cGVhaGVhZCkge1xuICAgICAgICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50eXBlYWhlYWQ7XG4gICAgICAgICAgfSlcbiAgICAgICAgKVxuICAgICAgICAuc3Vic2NyaWJlKChtYXRjaGVzKSA9PiB7XG4gICAgICAgICAgdGhpcy5maW5hbGl6ZUFzeW5jQ2FsbChtYXRjaGVzKTtcbiAgICAgICAgfSlcbiAgICApO1xuICB9XG5cbiAgcHJvdGVjdGVkIHN5bmNBY3Rpb25zKCk6IHZvaWQge1xuICAgIHRoaXMuX3N1YnNjcmlwdGlvbnMucHVzaChcbiAgICAgIHRoaXMua2V5VXBFdmVudEVtaXR0ZXJcbiAgICAgICAgLnBpcGUoXG4gICAgICAgICAgZGVib3VuY2VUaW1lPHN0cmluZz4odGhpcy50eXBlYWhlYWRXYWl0TXMpLFxuICAgICAgICAgIG1lcmdlTWFwKCh2YWx1ZTogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICB0aGlzLl9hbGxFbnRlcmVkVmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRRdWVyeSA9IHRoaXMubm9ybWFsaXplUXVlcnkodmFsdWUpO1xuXG4gICAgICAgICAgICBpZiAoIXRoaXMudHlwZWFoZWFkKSB7XG4gICAgICAgICAgICAgIHJldHVybiBFTVBUWTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgdHlwZWFoZWFkID0gaXNPYnNlcnZhYmxlKHRoaXMudHlwZWFoZWFkKSA/IHRoaXMudHlwZWFoZWFkIDogZnJvbSh0aGlzLnR5cGVhaGVhZCk7XG5cbiAgICAgICAgICAgIHJldHVybiB0eXBlYWhlYWQucGlwZShcbiAgICAgICAgICAgICAgZmlsdGVyKChvcHRpb246IFR5cGVhaGVhZE9wdGlvbikgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiAhIW9wdGlvbiAmJiB0aGlzLnRlc3RNYXRjaCh0aGlzLm5vcm1hbGl6ZU9wdGlvbihvcHRpb24pLCBub3JtYWxpemVkUXVlcnkpO1xuICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgdG9BcnJheSgpXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0pXG4gICAgICAgIClcbiAgICAgICAgLnN1YnNjcmliZSgobWF0Y2hlczogVHlwZWFoZWFkT3B0aW9uW10pID0+IHtcbiAgICAgICAgICB0aGlzLmZpbmFsaXplQXN5bmNDYWxsKG1hdGNoZXMpO1xuICAgICAgICB9KVxuICAgICk7XG4gIH1cblxuICBwcm90ZWN0ZWQgbm9ybWFsaXplT3B0aW9uKG9wdGlvbjogVHlwZWFoZWFkT3B0aW9uKTogc3RyaW5nIHtcbiAgICBjb25zdCBvcHRpb25WYWx1ZTogc3RyaW5nID0gZ2V0VmFsdWVGcm9tT2JqZWN0KG9wdGlvbiwgdGhpcy50eXBlYWhlYWRPcHRpb25GaWVsZCk7XG4gICAgY29uc3Qgbm9ybWFsaXplZE9wdGlvbiA9IHRoaXMudHlwZWFoZWFkTGF0aW5pemUgPyBsYXRpbml6ZShvcHRpb25WYWx1ZSkgOiBvcHRpb25WYWx1ZTtcblxuICAgIHJldHVybiBub3JtYWxpemVkT3B0aW9uLnRvTG93ZXJDYXNlKCk7XG4gIH1cblxuICBwcm90ZWN0ZWQgdG9rZW5pemVRdWVyeShjdXJyZW50UXVlcnk6IHN0cmluZyB8IHN0cmluZ1tdKTogc3RyaW5nIHwgc3RyaW5nW10ge1xuICAgIGxldCBxdWVyeSA9IGN1cnJlbnRRdWVyeTtcbiAgICBpZiAodGhpcy50eXBlYWhlYWRNdWx0aXBsZVNlYXJjaCAmJiB0aGlzLnR5cGVhaGVhZFNpbmdsZVdvcmRzKSB7XG4gICAgICBpZiAoXG4gICAgICAgICF0aGlzLmhhdmVDb21tb25DaGFyYWN0ZXJzKFxuICAgICAgICAgIGAke3RoaXMudHlwZWFoZWFkUGhyYXNlRGVsaW1pdGVyc30ke3RoaXMudHlwZWFoZWFkV29yZERlbGltaXRlcnN9YCxcbiAgICAgICAgICB0aGlzLnR5cGVhaGVhZE11bHRpcGxlU2VhcmNoRGVsaW1pdGVyc1xuICAgICAgICApXG4gICAgICApIHtcbiAgICAgICAgLy8gc2luZ2xlIHdvcmRzIGFuZCBtdWx0aXBsZSBzZWFyY2ggZGVsaW1pdGVycyBhcmUgZGlmZmVyZW50LCBjYW4gYmUgdXNlZCB0b2dldGhlclxuICAgICAgICBxdWVyeSA9IHRva2VuaXplKFxuICAgICAgICAgIHF1ZXJ5IGFzIHN0cmluZyxcbiAgICAgICAgICB0aGlzLnR5cGVhaGVhZFdvcmREZWxpbWl0ZXJzLFxuICAgICAgICAgIHRoaXMudHlwZWFoZWFkUGhyYXNlRGVsaW1pdGVycyxcbiAgICAgICAgICB0aGlzLnR5cGVhaGVhZE11bHRpcGxlU2VhcmNoRGVsaW1pdGVyc1xuICAgICAgICApO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodGhpcy50eXBlYWhlYWRTaW5nbGVXb3Jkcykge1xuICAgICAgcXVlcnkgPSB0b2tlbml6ZShxdWVyeSBhcyBzdHJpbmcsIHRoaXMudHlwZWFoZWFkV29yZERlbGltaXRlcnMsIHRoaXMudHlwZWFoZWFkUGhyYXNlRGVsaW1pdGVycyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIG11bHRpcGxlIHNlYXJjaGVzXG4gICAgICBxdWVyeSA9IHRva2VuaXplKHF1ZXJ5IGFzIHN0cmluZywgdm9pZCAwLCB2b2lkIDAsIHRoaXMudHlwZWFoZWFkTXVsdGlwbGVTZWFyY2hEZWxpbWl0ZXJzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcXVlcnk7XG4gIH1cblxuICBwcm90ZWN0ZWQgbm9ybWFsaXplUXVlcnkodmFsdWU6IHN0cmluZyk6IHN0cmluZyB8IHN0cmluZ1tdIHtcbiAgICAvLyBJZiBzaW5nbGVXb3JkcywgYnJlYWsgbW9kZWwgaGVyZSB0byBub3QgYmUgZG9pbmcgZXh0cmEgd29yayBvbiBlYWNoIGl0ZXJhdGlvblxuICAgIGxldCBub3JtYWxpemVkUXVlcnk6IHN0cmluZyB8IHN0cmluZ1tdID0gKHRoaXMudHlwZWFoZWFkTGF0aW5pemUgPyBsYXRpbml6ZSh2YWx1ZSkgOiB2YWx1ZSlcbiAgICAgIC50b1N0cmluZygpXG4gICAgICAudG9Mb3dlckNhc2UoKTtcblxuICAgIG5vcm1hbGl6ZWRRdWVyeSA9IHRoaXMudG9rZW5pemVRdWVyeShub3JtYWxpemVkUXVlcnkpO1xuXG4gICAgcmV0dXJuIG5vcm1hbGl6ZWRRdWVyeTtcbiAgfVxuXG4gIHByb3RlY3RlZCB0ZXN0TWF0Y2gobWF0Y2g6IHN0cmluZywgdGVzdDogc3RyaW5nW10gfCBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBsZXQgc3BhY2VMZW5ndGg6IG51bWJlcjtcblxuICAgIGlmICh0eXBlb2YgdGVzdCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHNwYWNlTGVuZ3RoID0gdGVzdC5sZW5ndGg7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNwYWNlTGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgaWYgKHRlc3RbaV0ubGVuZ3RoID4gMCAmJiBtYXRjaC5pbmRleE9mKHRlc3RbaV0pIDwgMCkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gbWF0Y2guaW5kZXhPZih0ZXN0KSA+PSAwO1xuICB9XG5cbiAgcHJvdGVjdGVkIGZpbmFsaXplQXN5bmNDYWxsKG1hdGNoZXM/OiBUeXBlYWhlYWRPcHRpb24gfCBUeXBlYWhlYWRPcHRpb25bXSk6IHZvaWQge1xuICAgIHRoaXMucHJlcGFyZU1hdGNoZXMobWF0Y2hlcyB8fCBbXSk7XG5cbiAgICB0aGlzLnR5cGVhaGVhZExvYWRpbmcuZW1pdChmYWxzZSk7XG4gICAgdGhpcy50eXBlYWhlYWROb1Jlc3VsdHMuZW1pdCghdGhpcy5oYXNNYXRjaGVzKCkpO1xuXG4gICAgaWYgKCF0aGlzLmhhc01hdGNoZXMoKSkge1xuICAgICAgdGhpcy5oaWRlKCk7XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuaXNGb2N1c2VkICYmIHRoaXMuY2FuY2VsUmVxdWVzdE9uRm9jdXNMb3N0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2NvbnRhaW5lciAmJiB0aGlzLm5nQ29udHJvbC5jb250cm9sKSB7XG4gICAgICAvLyBmaXg6IHJlbW92ZSB1c2FnZSBvZiBuZ0NvbnRyb2wgaW50ZXJuYWxzXG4gICAgICBjb25zdCBfY29udHJvbFZhbHVlID1cbiAgICAgICAgKHRoaXMudHlwZWFoZWFkTGF0aW5pemUgPyBsYXRpbml6ZSh0aGlzLm5nQ29udHJvbC5jb250cm9sLnZhbHVlKSA6IHRoaXMubmdDb250cm9sLmNvbnRyb2wudmFsdWUpIHx8ICcnO1xuXG4gICAgICAvLyBUaGlzIGltcHJvdmVzIHRoZSBzcGVlZCBhcyBpdCB3b24ndCBoYXZlIHRvIGJlIGRvbmUgZm9yIGVhY2ggbGlzdCBpdGVtXG4gICAgICBjb25zdCBub3JtYWxpemVkUXVlcnkgPSBfY29udHJvbFZhbHVlLnRvU3RyaW5nKCkudG9Mb3dlckNhc2UoKTtcblxuICAgICAgdGhpcy5fY29udGFpbmVyLnF1ZXJ5ID0gdGhpcy50b2tlbml6ZVF1ZXJ5KG5vcm1hbGl6ZWRRdWVyeSk7XG4gICAgICB0aGlzLl9jb250YWluZXIubWF0Y2hlcyA9IHRoaXMuX21hdGNoZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2hvdygpO1xuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBwcmVwYXJlTWF0Y2hlcyhvcHRpb25zOiBUeXBlYWhlYWRPcHRpb24gfCBUeXBlYWhlYWRPcHRpb25bXSk6IHZvaWQge1xuICAgIGNvbnN0IGxpbWl0ZWQgPSBvcHRpb25zLnNsaWNlKDAsIHRoaXMudHlwZWFoZWFkT3B0aW9uc0xpbWl0KTtcbiAgICBjb25zdCBzb3J0ZWQgPSAhdGhpcy50eXBlYWhlYWRPcmRlckJ5ID8gbGltaXRlZCA6IHRoaXMub3JkZXJNYXRjaGVzKGxpbWl0ZWQpO1xuXG4gICAgaWYgKHRoaXMudHlwZWFoZWFkR3JvdXBGaWVsZCkge1xuICAgICAgbGV0IG1hdGNoZXM6IFR5cGVhaGVhZE1hdGNoW10gPSBbXTtcblxuICAgICAgLy8gZXh0cmFjdCBhbGwgZ3JvdXAgbmFtZXNcbiAgICAgIGNvbnN0IGdyb3VwcyA9IHNvcnRlZFxuICAgICAgICAubWFwKChvcHRpb246IFR5cGVhaGVhZE9wdGlvbikgPT4gZ2V0VmFsdWVGcm9tT2JqZWN0KG9wdGlvbiwgdGhpcy50eXBlYWhlYWRHcm91cEZpZWxkKSlcbiAgICAgICAgLmZpbHRlcigodjogc3RyaW5nLCBpOiBudW1iZXIsIGE6IHN0cmluZ1tdKSA9PiBhLmluZGV4T2YodikgPT09IGkpO1xuXG4gICAgICBncm91cHMuZm9yRWFjaCgoZ3JvdXA6IHN0cmluZykgPT4ge1xuICAgICAgICAvLyBhZGQgZ3JvdXAgaGVhZGVyIHRvIGFycmF5IG9mIG1hdGNoZXNcbiAgICAgICAgbWF0Y2hlcy5wdXNoKG5ldyBUeXBlYWhlYWRNYXRjaChncm91cCwgZ3JvdXAsIHRydWUpKTtcblxuICAgICAgICAvLyBhZGQgZWFjaCBpdGVtIG9mIGdyb3VwIHRvIGFycmF5IG9mIG1hdGNoZXNcbiAgICAgICAgbWF0Y2hlcyA9IG1hdGNoZXMuY29uY2F0KFxuICAgICAgICAgIHNvcnRlZFxuICAgICAgICAgICAgLmZpbHRlcigob3B0aW9uOiBUeXBlYWhlYWRPcHRpb24pID0+IGdldFZhbHVlRnJvbU9iamVjdChvcHRpb24sIHRoaXMudHlwZWFoZWFkR3JvdXBGaWVsZCkgPT09IGdyb3VwKVxuICAgICAgICAgICAgLm1hcChcbiAgICAgICAgICAgICAgKG9wdGlvbjogVHlwZWFoZWFkT3B0aW9uKSA9PlxuICAgICAgICAgICAgICAgIG5ldyBUeXBlYWhlYWRNYXRjaChvcHRpb24sIGdldFZhbHVlRnJvbU9iamVjdChvcHRpb24sIHRoaXMudHlwZWFoZWFkT3B0aW9uRmllbGQpKVxuICAgICAgICAgICAgKVxuICAgICAgICApO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuX21hdGNoZXMgPSBtYXRjaGVzO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9tYXRjaGVzID0gc29ydGVkLm1hcChcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAgICAgKG9wdGlvbjogYW55KSA9PiBuZXcgVHlwZWFoZWFkTWF0Y2gob3B0aW9uLCBnZXRWYWx1ZUZyb21PYmplY3Qob3B0aW9uLCB0aGlzLnR5cGVhaGVhZE9wdGlvbkZpZWxkKSlcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgcHJvdGVjdGVkIG9yZGVyTWF0Y2hlcyhvcHRpb25zOiBUeXBlYWhlYWRPcHRpb25bXSk6IFR5cGVhaGVhZE9wdGlvbltdIHtcbiAgICBpZiAoIW9wdGlvbnMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gb3B0aW9ucztcbiAgICB9XG5cbiAgICBpZiAoXG4gICAgICB0aGlzLnR5cGVhaGVhZE9yZGVyQnkgIT09IG51bGwgJiZcbiAgICAgIHRoaXMudHlwZWFoZWFkT3JkZXJCeSAhPT0gdW5kZWZpbmVkICYmXG4gICAgICB0eXBlb2YgdGhpcy50eXBlYWhlYWRPcmRlckJ5ID09PSAnb2JqZWN0JyAmJlxuICAgICAgT2JqZWN0LmtleXModGhpcy50eXBlYWhlYWRPcmRlckJ5KS5sZW5ndGggPT09IDBcbiAgICApIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZpZWxkIGFuZCBkaXJlY3Rpb24gcHJvcGVydGllcyBmb3IgdHlwZWFoZWFkT3JkZXJCeSBoYXZlIHRvIGJlIHNldCBhY2NvcmRpbmcgdG8gZG9jdW1lbnRhdGlvbiEnKTtcblxuICAgICAgcmV0dXJuIG9wdGlvbnM7XG4gICAgfVxuXG4gICAgY29uc3QgeyBmaWVsZCwgZGlyZWN0aW9uIH0gPSB0aGlzLnR5cGVhaGVhZE9yZGVyQnkgfHwge307XG5cbiAgICBpZiAoIWRpcmVjdGlvbiB8fCAhKGRpcmVjdGlvbiA9PT0gJ2FzYycgfHwgZGlyZWN0aW9uID09PSAnZGVzYycpKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCd0eXBlYWhlYWRPcmRlckJ5IGRpcmVjdGlvbiBoYXMgdG8gZXF1YWwgXCJhc2NcIiBvciBcImRlc2NcIi4gUGxlYXNlIGZvbGxvdyB0aGUgZG9jdW1lbnRhdGlvbi4nKTtcblxuICAgICAgcmV0dXJuIG9wdGlvbnM7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBvcHRpb25zWzBdID09PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIGRpcmVjdGlvbiA9PT0gJ2FzYycgPyBvcHRpb25zLnNvcnQoKSA6IG9wdGlvbnMuc29ydCgpLnJldmVyc2UoKTtcbiAgICB9XG5cbiAgICBpZiAoIWZpZWxkIHx8IHR5cGVvZiBmaWVsZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ3R5cGVhaGVhZE9yZGVyQnkgZmllbGQgaGFzIHRvIHNldCBhY2NvcmRpbmcgdG8gdGhlIGRvY3VtZW50YXRpb24uJyk7XG5cbiAgICAgIHJldHVybiBvcHRpb25zO1xuICAgIH1cblxuICAgIHJldHVybiBvcHRpb25zLnNvcnQoKGE6IFR5cGVhaGVhZE9wdGlvbiwgYjogVHlwZWFoZWFkT3B0aW9uKSA9PiB7XG4gICAgICBjb25zdCBzdHJpbmdBID0gZ2V0VmFsdWVGcm9tT2JqZWN0KGEsIGZpZWxkKTtcbiAgICAgIGNvbnN0IHN0cmluZ0IgPSBnZXRWYWx1ZUZyb21PYmplY3QoYiwgZmllbGQpO1xuXG4gICAgICBpZiAoc3RyaW5nQSA8IHN0cmluZ0IpIHtcbiAgICAgICAgcmV0dXJuIGRpcmVjdGlvbiA9PT0gJ2FzYycgPyAtMSA6IDE7XG4gICAgICB9XG5cbiAgICAgIGlmIChzdHJpbmdBID4gc3RyaW5nQikge1xuICAgICAgICByZXR1cm4gZGlyZWN0aW9uID09PSAnYXNjJyA/IDEgOiAtMTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIDA7XG4gICAgfSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgaGFzTWF0Y2hlcygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fbWF0Y2hlcy5sZW5ndGggPiAwO1xuICB9XG5cbiAgcHJvdGVjdGVkIGNoZWNrRGVsaW1pdGVyc0NvbmZsaWN0KCk6IHZvaWQge1xuICAgIGlmIChcbiAgICAgIHRoaXMudHlwZWFoZWFkTXVsdGlwbGVTZWFyY2ggJiZcbiAgICAgIHRoaXMudHlwZWFoZWFkU2luZ2xlV29yZHMgJiZcbiAgICAgIHRoaXMuaGF2ZUNvbW1vbkNoYXJhY3RlcnMoXG4gICAgICAgIGAke3RoaXMudHlwZWFoZWFkUGhyYXNlRGVsaW1pdGVyc30ke3RoaXMudHlwZWFoZWFkV29yZERlbGltaXRlcnN9YCxcbiAgICAgICAgdGhpcy50eXBlYWhlYWRNdWx0aXBsZVNlYXJjaERlbGltaXRlcnNcbiAgICAgIClcbiAgICApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRGVsaW1pdGVycyB1c2VkIGluIHR5cGVhaGVhZE11bHRpcGxlU2VhcmNoRGVsaW1pdGVycyBtdXN0IGJlIGRpZmZlcmVudFxuICAgICAgICAgIGZyb20gZGVsaW1pdGVycyB1c2VkIGluIHR5cGVhaGVhZFdvcmREZWxpbWl0ZXJzIChjdXJyZW50IHZhbHVlOiAke3RoaXMudHlwZWFoZWFkV29yZERlbGltaXRlcnN9KSBhbmRcbiAgICAgICAgICB0eXBlYWhlYWRQaHJhc2VEZWxpbWl0ZXJzIChjdXJyZW50IHZhbHVlOiAke3RoaXMudHlwZWFoZWFkUGhyYXNlRGVsaW1pdGVyc30pLlxuICAgICAgICAgIFBsZWFzZSByZWZlciB0byB0aGUgZG9jdW1lbnRhdGlvbmApO1xuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBoYXZlQ29tbW9uQ2hhcmFjdGVycyhzdHIxOiBzdHJpbmcsIHN0cjI6IHN0cmluZykge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RyMS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHN0cjEuY2hhckF0KGkpLmluZGV4T2Yoc3RyMikgPiAtMSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cbiJdfQ==