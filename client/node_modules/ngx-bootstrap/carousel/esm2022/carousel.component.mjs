/***
 * pause (not yet supported) (?string='hover') - event group name which pauses
 * the cycling of the carousel, if hover pauses on mouseenter and resumes on
 * mouseleave keyboard (not yet supported) (?boolean=true) - if false
 * carousel will not react to keyboard events
 * note: swiping not yet supported
 */
/****
 * Problems:
 * 1) if we set an active slide via model changes, .active class remains on a
 * current slide.
 * 2) if we have only one slide, we shouldn't show prev/next nav buttons
 * 3) if first or last slide is active and noWrap is true, there should be
 * "disabled" class on the nav buttons.
 * 4) default interval should be equal 5000
 */
import { Component, EventEmitter, Input, NgZone, Output, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, NgIf, NgFor, NgStyle } from '@angular/common';
import { LinkedList, getBsVer } from 'ngx-bootstrap/utils';
import { CarouselConfig } from './carousel.config';
import { findLastIndex, chunkByNumber, isNumber } from './utils';
import * as i0 from "@angular/core";
import * as i1 from "./carousel.config";
export var Direction;
(function (Direction) {
    Direction[Direction["UNKNOWN"] = 0] = "UNKNOWN";
    Direction[Direction["NEXT"] = 1] = "NEXT";
    Direction[Direction["PREV"] = 2] = "PREV";
})(Direction || (Direction = {}));
let _currentId = 1;
/**
 * Base element to create carousel
 */
export class CarouselComponent {
    /** Index of currently displayed slide(started for 0) */
    set activeSlide(index) {
        if (this.multilist) {
            return;
        }
        if (isNumber(index)) {
            this.customActiveSlide = index;
        }
        if (this._slides.length && index !== this._currentActiveSlide) {
            this._select(index);
        }
    }
    get activeSlide() {
        return this._currentActiveSlide || 0;
    }
    /**
     * Delay of item cycling in milliseconds. If false, carousel won't cycle
     * automatically.
     */
    get interval() {
        return this._interval;
    }
    set interval(value) {
        this._interval = value;
        this.restartTimer();
    }
    get slides() {
        return this._slides.toArray();
    }
    get isFirstSlideVisible() {
        const indexes = this.getVisibleIndexes();
        if (!indexes || (indexes instanceof Array && !indexes.length)) {
            return false;
        }
        return indexes.includes(0);
    }
    get isLastSlideVisible() {
        const indexes = this.getVisibleIndexes();
        if (!indexes || (indexes instanceof Array && !indexes.length)) {
            return false;
        }
        return indexes.includes(this._slides.length - 1);
    }
    get _bsVer() {
        return getBsVer();
    }
    constructor(config, ngZone, platformId) {
        this.ngZone = ngZone;
        this.platformId = platformId;
        /* If `true` — carousel will not cycle continuously and will have hard stops (prevent looping) */
        this.noWrap = false;
        /*  If `true` — will disable pausing on carousel mouse hover */
        this.noPause = false;
        /*  If `true` — carousel-indicators are visible  */
        this.showIndicators = true;
        /*  If `true` - autoplay will be stopped on focus */
        this.pauseOnFocus = false;
        /* If `true` - carousel indicators indicate slides chunks
           works ONLY if singleSlideOffset = FALSE */
        this.indicatorsByChunk = false;
        /* If value more then 1 — carousel works in multilist mode */
        this.itemsPerSlide = 1;
        /* If `true` — carousel shifts by one element. By default carousel shifts by number
           of visible elements (itemsPerSlide field) */
        this.singleSlideOffset = false;
        /** Turn on/off animation. Animation doesn't work for multilist carousel */
        this.isAnimated = false;
        /** Will be emitted when active slide has been changed. Part of two-way-bindable [(activeSlide)] property */
        this.activeSlideChange = new EventEmitter(false);
        /** Will be emitted when active slides has been changed in multilist mode */
        this.slideRangeChange = new EventEmitter();
        /* Index to start display slides from it */
        this.startFromIndex = 0;
        this._interval = 5000;
        this._slides = new LinkedList();
        this._currentVisibleSlidesIndex = 0;
        this.isPlaying = false;
        this.destroyed = false;
        this.currentId = 0;
        this.getActive = (slide) => slide.active;
        this.makeSlidesConsistent = (slides) => {
            slides.forEach((slide, index) => slide.item.order = index);
        };
        Object.assign(this, config);
        this.currentId = _currentId++;
    }
    ngAfterViewInit() {
        setTimeout(() => {
            if (this.singleSlideOffset) {
                this.indicatorsByChunk = false;
            }
            if (this.multilist) {
                this._chunkedSlides = chunkByNumber(this.mapSlidesAndIndexes(), this.itemsPerSlide);
                this.selectInitialSlides();
            }
            if (this.customActiveSlide && !this.multilist) {
                this._select(this.customActiveSlide);
            }
        }, 0);
    }
    ngOnDestroy() {
        this.destroyed = true;
    }
    /**
     * Adds new slide. If this slide is first in collection - set it as active
     * and starts auto changing
     * @param slide
     */
    addSlide(slide) {
        this._slides.add(slide);
        if (this.multilist && this._slides.length <= this.itemsPerSlide) {
            slide.active = true;
        }
        if (!this.multilist && this.isAnimated) {
            slide.isAnimated = true;
        }
        if (!this.multilist && this._slides.length === 1) {
            this._currentActiveSlide = undefined;
            if (!this.customActiveSlide) {
                this.activeSlide = 0;
            }
            this.play();
        }
        if (this.multilist && this._slides.length > this.itemsPerSlide) {
            this.play();
        }
    }
    /**
     * Removes specified slide. If this slide is active - will roll to another
     * slide
     * @param slide
     */
    removeSlide(slide) {
        const remIndex = this._slides.indexOf(slide);
        if (this._currentActiveSlide === remIndex) {
            // removing of active slide
            let nextSlideIndex;
            if (this._slides.length > 1) {
                // if this slide last - will roll to first slide, if noWrap flag is
                // FALSE or to previous, if noWrap is TRUE in case, if this slide in
                // middle of collection, index of next slide is same to removed
                nextSlideIndex = !this.isLast(remIndex)
                    ? remIndex
                    : this.noWrap ? remIndex - 1 : 0;
            }
            this._slides.remove(remIndex);
            // prevents exception with changing some value after checking
            setTimeout(() => {
                this._select(nextSlideIndex);
            }, 0);
        }
        else {
            this._slides.remove(remIndex);
            const currentSlideIndex = this.getCurrentSlideIndex();
            setTimeout(() => {
                // after removing, need to actualize index of current active slide
                this._currentActiveSlide = currentSlideIndex;
                this.activeSlideChange.emit(this._currentActiveSlide);
            }, 0);
        }
    }
    nextSlideFromInterval(force = false) {
        this.move(Direction.NEXT, force);
    }
    /**
     * Rolling to next slide
     * @param force: {boolean} if true - will ignore noWrap flag
     */
    nextSlide(force = false) {
        if (this.isPlaying) {
            this.restartTimer();
        }
        this.move(Direction.NEXT, force);
    }
    /**
     * Rolling to previous slide
     * @param force: {boolean} if true - will ignore noWrap flag
     */
    previousSlide(force = false) {
        if (this.isPlaying) {
            this.restartTimer();
        }
        this.move(Direction.PREV, force);
    }
    getFirstVisibleIndex() {
        return this.slides.findIndex(this.getActive);
    }
    getLastVisibleIndex() {
        return findLastIndex(this.slides, this.getActive);
    }
    move(direction, force = false) {
        const firstVisibleIndex = this.getFirstVisibleIndex();
        const lastVisibleIndex = this.getLastVisibleIndex();
        if (this.noWrap) {
            if (direction === Direction.NEXT &&
                this.isLast(lastVisibleIndex) ||
                direction === Direction.PREV &&
                    firstVisibleIndex === 0) {
                return;
            }
        }
        if (!this.multilist) {
            this.activeSlide = this.findNextSlideIndex(direction, force) || 0;
        }
        else {
            this.moveMultilist(direction);
        }
    }
    /**
     * Swith slides by enter, space and arrows keys
     * @internal
     */
    keydownPress(event) {
        if (event.keyCode === 13 || event.key === 'Enter' || event.keyCode === 32 || event.key === 'Space') {
            this.nextSlide();
            event.preventDefault();
            return;
        }
        if (event.keyCode === 37 || event.key === 'LeftArrow') {
            this.previousSlide();
            return;
        }
        if (event.keyCode === 39 || event.key === 'RightArrow') {
            this.nextSlide();
            return;
        }
    }
    /**
     * Play on mouse leave
     * @internal
     */
    onMouseLeave() {
        if (!this.pauseOnFocus) {
            this.play();
        }
    }
    /**
     * Play on mouse up
     * @internal
     */
    onMouseUp() {
        if (!this.pauseOnFocus) {
            this.play();
        }
    }
    /**
     * When slides on focus autoplay is stopped(optional)
     * @internal
     */
    pauseFocusIn() {
        if (this.pauseOnFocus) {
            this.isPlaying = false;
            this.resetTimer();
        }
    }
    /**
     * When slides out of focus autoplay is started
     * @internal
     */
    pauseFocusOut() {
        this.play();
    }
    /**
     * Rolling to specified slide
     * @param index: {number} index of slide, which must be shown
     */
    selectSlide(index) {
        if (this.isPlaying) {
            this.restartTimer();
        }
        if (!this.multilist) {
            this.activeSlide = this.indicatorsByChunk ? index * this.itemsPerSlide : index;
        }
        else {
            this.selectSlideRange(this.indicatorsByChunk ? index * this.itemsPerSlide : index);
        }
    }
    /**
     * Starts a auto changing of slides
     */
    play() {
        if (!this.isPlaying) {
            this.isPlaying = true;
            this.restartTimer();
        }
    }
    /**
     * Stops a auto changing of slides
     */
    pause() {
        if (!this.noPause) {
            this.isPlaying = false;
            this.resetTimer();
        }
    }
    /**
     * Finds and returns index of currently displayed slide
     */
    getCurrentSlideIndex() {
        return this._slides.findIndex(this.getActive);
    }
    /**
     * Defines, whether the specified index is last in collection
     * @param index
     */
    isLast(index) {
        return index + 1 >= this._slides.length;
    }
    /**
     * Defines, whether the specified index is first in collection
     * @param index
     */
    isFirst(index) {
        return index === 0;
    }
    indicatorsSlides() {
        return this.slides.filter((slide, index) => !this.indicatorsByChunk || index % this.itemsPerSlide === 0);
    }
    selectInitialSlides() {
        const startIndex = this.startFromIndex <= this._slides.length
            ? this.startFromIndex
            : 0;
        this.hideSlides();
        if (this.singleSlideOffset) {
            this._slidesWithIndexes = this.mapSlidesAndIndexes();
            if (this._slides.length - startIndex < this.itemsPerSlide) {
                const slidesToAppend = this._slidesWithIndexes.slice(0, startIndex);
                this._slidesWithIndexes = [
                    ...this._slidesWithIndexes,
                    ...slidesToAppend
                ]
                    .slice(slidesToAppend.length)
                    .slice(0, this.itemsPerSlide);
            }
            else {
                this._slidesWithIndexes = this._slidesWithIndexes.slice(startIndex, startIndex + this.itemsPerSlide);
            }
            this._slidesWithIndexes.forEach((slide) => slide.item.active = true);
            this.makeSlidesConsistent(this._slidesWithIndexes);
        }
        else {
            this.selectRangeByNestedIndex(startIndex);
        }
        this.slideRangeChange.emit(this.getVisibleIndexes());
    }
    /**
     * Defines next slide index, depending of direction
     * @param direction: Direction(UNKNOWN|PREV|NEXT)
     * @param force: {boolean} if TRUE - will ignore noWrap flag, else will
     *   return undefined if next slide require wrapping
     */
    findNextSlideIndex(direction, force) {
        let nextSlideIndex = 0;
        if (!force &&
            (this.isLast(this.activeSlide) &&
                direction !== Direction.PREV &&
                this.noWrap)) {
            return;
        }
        switch (direction) {
            case Direction.NEXT:
                // if this is last slide, not force, looping is disabled
                // and need to going forward - select current slide, as a next
                if (typeof this._currentActiveSlide === 'undefined') {
                    nextSlideIndex = 0;
                    break;
                }
                if (!this.isLast(this._currentActiveSlide)) {
                    nextSlideIndex = this._currentActiveSlide + 1;
                    break;
                }
                nextSlideIndex = !force && this.noWrap ? this._currentActiveSlide : 0;
                break;
            case Direction.PREV:
                // if this is first slide, not force, looping is disabled
                // and need to going backward - select current slide, as a next
                if (typeof this._currentActiveSlide === 'undefined') {
                    nextSlideIndex = 0;
                    break;
                }
                if (this._currentActiveSlide > 0) {
                    nextSlideIndex = this._currentActiveSlide - 1;
                    break;
                }
                if (!force && this.noWrap) {
                    nextSlideIndex = this._currentActiveSlide;
                    break;
                }
                nextSlideIndex = this._slides.length - 1;
                break;
            default:
                throw new Error('Unknown direction');
        }
        return nextSlideIndex;
    }
    mapSlidesAndIndexes() {
        return this.slides
            .slice()
            .map((slide, index) => {
            return {
                index,
                item: slide
            };
        });
    }
    selectSlideRange(index) {
        if (this.isIndexInRange(index)) {
            return;
        }
        this.hideSlides();
        if (!this.singleSlideOffset) {
            this.selectRangeByNestedIndex(index);
        }
        else {
            const startIndex = this.isIndexOnTheEdges(index)
                ? index
                : index - this.itemsPerSlide + 1;
            const endIndex = this.isIndexOnTheEdges(index)
                ? index + this.itemsPerSlide
                : index + 1;
            this._slidesWithIndexes = this.mapSlidesAndIndexes().slice(startIndex, endIndex);
            this.makeSlidesConsistent(this._slidesWithIndexes);
            this._slidesWithIndexes.forEach((slide) => slide.item.active = true);
        }
        this.slideRangeChange.emit(this.getVisibleIndexes());
    }
    selectRangeByNestedIndex(index) {
        if (!this._chunkedSlides) {
            return;
        }
        const selectedRange = this._chunkedSlides
            .map((slidesList, i) => {
            return {
                index: i,
                list: slidesList
            };
        })
            .find((slidesList) => {
            return slidesList.list.find(slide => slide.index === index) !== undefined;
        });
        if (!selectedRange) {
            return;
        }
        this._currentVisibleSlidesIndex = selectedRange.index;
        this._chunkedSlides[selectedRange.index].forEach((slide) => {
            slide.item.active = true;
        });
    }
    isIndexOnTheEdges(index) {
        return (index + 1 - this.itemsPerSlide <= 0 ||
            index + this.itemsPerSlide <= this._slides.length);
    }
    isIndexInRange(index) {
        if (this.singleSlideOffset && this._slidesWithIndexes) {
            const visibleIndexes = this._slidesWithIndexes.map((slide) => slide.index);
            return visibleIndexes.indexOf(index) >= 0;
        }
        return (index <= this.getLastVisibleIndex() &&
            index >= this.getFirstVisibleIndex());
    }
    hideSlides() {
        this.slides.forEach((slide) => slide.active = false);
    }
    isVisibleSlideListLast() {
        if (!this._chunkedSlides) {
            return false;
        }
        return this._currentVisibleSlidesIndex === this._chunkedSlides.length - 1;
    }
    isVisibleSlideListFirst() {
        return this._currentVisibleSlidesIndex === 0;
    }
    moveSliderByOneItem(direction) {
        let firstVisibleIndex;
        let lastVisibleIndex;
        let indexToHide;
        let indexToShow;
        if (this.noWrap) {
            firstVisibleIndex = this.getFirstVisibleIndex();
            lastVisibleIndex = this.getLastVisibleIndex();
            indexToHide = direction === Direction.NEXT
                ? firstVisibleIndex
                : lastVisibleIndex;
            indexToShow = direction !== Direction.NEXT
                ? firstVisibleIndex - 1
                : !this.isLast(lastVisibleIndex)
                    ? lastVisibleIndex + 1 : 0;
            const slideToHide = this._slides.get(indexToHide);
            if (slideToHide) {
                slideToHide.active = false;
            }
            const slideToShow = this._slides.get(indexToShow);
            if (slideToShow) {
                slideToShow.active = true;
            }
            const slidesToReorder = this.mapSlidesAndIndexes().filter((slide) => slide.item.active);
            this.makeSlidesConsistent(slidesToReorder);
            if (this.singleSlideOffset) {
                this._slidesWithIndexes = slidesToReorder;
            }
            this.slideRangeChange.emit(this.getVisibleIndexes());
            return;
        }
        if (!this._slidesWithIndexes || !this._slidesWithIndexes[0]) {
            return;
        }
        let index;
        firstVisibleIndex = this._slidesWithIndexes[0].index;
        lastVisibleIndex = this._slidesWithIndexes[this._slidesWithIndexes.length - 1].index;
        if (direction === Direction.NEXT) {
            this._slidesWithIndexes.shift();
            index = this.isLast(lastVisibleIndex)
                ? 0
                : lastVisibleIndex + 1;
            const item = this._slides.get(index);
            if (item) {
                this._slidesWithIndexes.push({ index, item });
            }
        }
        else {
            this._slidesWithIndexes.pop();
            index = this.isFirst(firstVisibleIndex)
                ? this._slides.length - 1
                : firstVisibleIndex - 1;
            const item = this._slides.get(index);
            if (item) {
                this._slidesWithIndexes = [{ index, item }, ...this._slidesWithIndexes];
            }
        }
        this.hideSlides();
        this._slidesWithIndexes.forEach(slide => slide.item.active = true);
        this.makeSlidesConsistent(this._slidesWithIndexes);
        this.slideRangeChange.emit(this._slidesWithIndexes.map((slide) => slide.index));
    }
    moveMultilist(direction) {
        if (this.singleSlideOffset) {
            this.moveSliderByOneItem(direction);
        }
        else {
            this.hideSlides();
            if (this.noWrap) {
                this._currentVisibleSlidesIndex = direction === Direction.NEXT
                    ? this._currentVisibleSlidesIndex + 1
                    : this._currentVisibleSlidesIndex - 1;
            }
            else if (direction === Direction.NEXT) {
                this._currentVisibleSlidesIndex = this.isVisibleSlideListLast()
                    ? 0
                    : this._currentVisibleSlidesIndex + 1;
            }
            else {
                if (this.isVisibleSlideListFirst()) {
                    this._currentVisibleSlidesIndex = this._chunkedSlides
                        ? this._chunkedSlides.length - 1
                        : 0;
                }
                else {
                    this._currentVisibleSlidesIndex = this._currentVisibleSlidesIndex - 1;
                }
            }
            if (this._chunkedSlides) {
                this._chunkedSlides[this._currentVisibleSlidesIndex].forEach((slide) => slide.item.active = true);
            }
            this.slideRangeChange.emit(this.getVisibleIndexes());
        }
    }
    getVisibleIndexes() {
        if (!this.singleSlideOffset && this._chunkedSlides) {
            return this._chunkedSlides[this._currentVisibleSlidesIndex]
                .map((slide) => slide.index);
        }
        if (this._slidesWithIndexes) {
            return this._slidesWithIndexes.map((slide) => slide.index);
        }
    }
    /**
     * Sets a slide, which specified through index, as active
     * @param index
     */
    _select(index) {
        if (isNaN(index)) {
            this.pause();
            return;
        }
        if (!this.multilist && typeof this._currentActiveSlide !== 'undefined') {
            const currentSlide = this._slides.get(this._currentActiveSlide);
            if (typeof currentSlide !== 'undefined') {
                currentSlide.active = false;
            }
        }
        const nextSlide = this._slides.get(index);
        if (typeof nextSlide !== 'undefined') {
            this._currentActiveSlide = index;
            nextSlide.active = true;
            this.activeSlide = index;
            this.activeSlideChange.emit(index);
        }
    }
    /**
     * Starts loop of auto changing of slides
     */
    restartTimer() {
        this.resetTimer();
        const interval = +this.interval;
        if (!isNaN(interval) && interval > 0 && isPlatformBrowser(this.platformId)) {
            this.currentInterval = this.ngZone.runOutsideAngular(() => {
                return window.setInterval(() => {
                    const nInterval = +this.interval;
                    this.ngZone.run(() => {
                        if (this.isPlaying &&
                            !isNaN(this.interval) &&
                            nInterval > 0 &&
                            this.slides.length) {
                            this.nextSlideFromInterval();
                        }
                        else {
                            this.pause();
                        }
                    });
                }, interval);
            });
        }
    }
    get multilist() {
        return this.itemsPerSlide > 1;
    }
    /**
     * Stops loop of auto changing of slides
     */
    resetTimer() {
        if (this.currentInterval) {
            clearInterval(this.currentInterval);
            this.currentInterval = void 0;
        }
    }
    checkDisabledClass(buttonType) {
        if (buttonType === 'prev') {
            return (this.activeSlide === 0 && this.noWrap && !this.multilist) || (this.isFirstSlideVisible && this.noWrap && this.multilist);
        }
        return (this.isLast(this.activeSlide) && this.noWrap && !this.multilist) || (this.isLastSlideVisible && this.noWrap && this.multilist);
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: CarouselComponent, deps: [{ token: i1.CarouselConfig }, { token: i0.NgZone }, { token: PLATFORM_ID }], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "18.0.1", type: CarouselComponent, isStandalone: true, selector: "carousel", inputs: { noWrap: "noWrap", noPause: "noPause", showIndicators: "showIndicators", pauseOnFocus: "pauseOnFocus", indicatorsByChunk: "indicatorsByChunk", itemsPerSlide: "itemsPerSlide", singleSlideOffset: "singleSlideOffset", isAnimated: "isAnimated", activeSlide: "activeSlide", startFromIndex: "startFromIndex", interval: "interval" }, outputs: { activeSlideChange: "activeSlideChange", slideRangeChange: "slideRangeChange" }, ngImport: i0, template: "<div (mouseenter)=\"pause()\"\n     (mouseleave)=\"onMouseLeave()\"\n     (mouseup)=\"onMouseUp()\"\n     (keydown)=\"keydownPress($event)\"\n     (focusin)=\"pauseFocusIn()\"\n     (focusout)=\"pauseFocusOut()\"\n     [id]=\"'carousel' + currentId\"\n     class=\"carousel slide\" tabindex=\"0\">\n  <ng-container *ngIf=\"!_bsVer.isBs5 && showIndicators && slides.length > 1\">\n    <ol class=\"carousel-indicators\">\n      <li *ngFor=\"let slide of indicatorsSlides(); let i = index;\"\n          [class.active]=\"slide.active === true\"\n          (click)=\"selectSlide(i)\">\n      </li>\n    </ol>\n  </ng-container>\n  <ng-container *ngIf=\"_bsVer.isBs5 && showIndicators && slides.length > 1\">\n    <div class=\"carousel-indicators\">\n      <button\n        *ngFor=\"let slide of indicatorsSlides(); let i = index;\"\n        [class.active]=\"slide.active === true\"\n        (click)=\"selectSlide(i)\"\n        type=\"button\"\n        [attr.data-bs-target]=\"'#carousel' + currentId\"\n        [attr.data-bs-slide-to]=\"i\" aria-current=\"true\"\n      >\n      </button>\n    </div>\n  </ng-container>\n  <div class=\"carousel-inner\" [ngStyle]=\"{'display': multilist ? 'flex' : 'block'}\">\n    <ng-content></ng-content>\n  </div>\n  <a class=\"left carousel-control carousel-control-prev\"\n     href=\"javascript:void(0);\"\n     [class.disabled]=\"checkDisabledClass('prev')\"\n     [attr.data-bs-target]=\"'#carousel' + currentId\"\n     *ngIf=\"slides.length > 1\"\n     (click)=\"previousSlide()\"\n     tabindex=\"0\" role=\"button\">\n    <span class=\"icon-prev carousel-control-prev-icon\" aria-hidden=\"true\"></span>\n    <span class=\"sr-only visually-hidden\">Previous</span>\n  </a>\n\n  <a class=\"right carousel-control carousel-control-next\"\n     href=\"javascript:void(0);\"\n     *ngIf=\"slides.length > 1\"\n     (click)=\"nextSlide()\"\n     [class.disabled]=\"checkDisabledClass('next')\"\n     [attr.data-bs-target]=\"'#carousel' + currentId\"\n     tabindex=\"0\" role=\"button\">\n    <span class=\"icon-next carousel-control-next-icon\" aria-hidden=\"true\"></span>\n    <span class=\"sr-only visually-hidden\">Next</span>\n  </a>\n</div>\n", dependencies: [{ kind: "directive", type: NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }, { kind: "directive", type: NgFor, selector: "[ngFor][ngForOf]", inputs: ["ngForOf", "ngForTrackBy", "ngForTemplate"] }, { kind: "directive", type: NgStyle, selector: "[ngStyle]", inputs: ["ngStyle"] }] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: CarouselComponent, decorators: [{
            type: Component,
            args: [{ selector: 'carousel', standalone: true, imports: [NgIf, NgFor, NgStyle], template: "<div (mouseenter)=\"pause()\"\n     (mouseleave)=\"onMouseLeave()\"\n     (mouseup)=\"onMouseUp()\"\n     (keydown)=\"keydownPress($event)\"\n     (focusin)=\"pauseFocusIn()\"\n     (focusout)=\"pauseFocusOut()\"\n     [id]=\"'carousel' + currentId\"\n     class=\"carousel slide\" tabindex=\"0\">\n  <ng-container *ngIf=\"!_bsVer.isBs5 && showIndicators && slides.length > 1\">\n    <ol class=\"carousel-indicators\">\n      <li *ngFor=\"let slide of indicatorsSlides(); let i = index;\"\n          [class.active]=\"slide.active === true\"\n          (click)=\"selectSlide(i)\">\n      </li>\n    </ol>\n  </ng-container>\n  <ng-container *ngIf=\"_bsVer.isBs5 && showIndicators && slides.length > 1\">\n    <div class=\"carousel-indicators\">\n      <button\n        *ngFor=\"let slide of indicatorsSlides(); let i = index;\"\n        [class.active]=\"slide.active === true\"\n        (click)=\"selectSlide(i)\"\n        type=\"button\"\n        [attr.data-bs-target]=\"'#carousel' + currentId\"\n        [attr.data-bs-slide-to]=\"i\" aria-current=\"true\"\n      >\n      </button>\n    </div>\n  </ng-container>\n  <div class=\"carousel-inner\" [ngStyle]=\"{'display': multilist ? 'flex' : 'block'}\">\n    <ng-content></ng-content>\n  </div>\n  <a class=\"left carousel-control carousel-control-prev\"\n     href=\"javascript:void(0);\"\n     [class.disabled]=\"checkDisabledClass('prev')\"\n     [attr.data-bs-target]=\"'#carousel' + currentId\"\n     *ngIf=\"slides.length > 1\"\n     (click)=\"previousSlide()\"\n     tabindex=\"0\" role=\"button\">\n    <span class=\"icon-prev carousel-control-prev-icon\" aria-hidden=\"true\"></span>\n    <span class=\"sr-only visually-hidden\">Previous</span>\n  </a>\n\n  <a class=\"right carousel-control carousel-control-next\"\n     href=\"javascript:void(0);\"\n     *ngIf=\"slides.length > 1\"\n     (click)=\"nextSlide()\"\n     [class.disabled]=\"checkDisabledClass('next')\"\n     [attr.data-bs-target]=\"'#carousel' + currentId\"\n     tabindex=\"0\" role=\"button\">\n    <span class=\"icon-next carousel-control-next-icon\" aria-hidden=\"true\"></span>\n    <span class=\"sr-only visually-hidden\">Next</span>\n  </a>\n</div>\n" }]
        }], ctorParameters: () => [{ type: i1.CarouselConfig }, { type: i0.NgZone }, { type: undefined, decorators: [{
                    type: Inject,
                    args: [PLATFORM_ID]
                }] }], propDecorators: { noWrap: [{
                type: Input
            }], noPause: [{
                type: Input
            }], showIndicators: [{
                type: Input
            }], pauseOnFocus: [{
                type: Input
            }], indicatorsByChunk: [{
                type: Input
            }], itemsPerSlide: [{
                type: Input
            }], singleSlideOffset: [{
                type: Input
            }], isAnimated: [{
                type: Input
            }], activeSlideChange: [{
                type: Output
            }], slideRangeChange: [{
                type: Output
            }], activeSlide: [{
                type: Input
            }], startFromIndex: [{
                type: Input
            }], interval: [{
                type: Input
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2Fyb3VzZWwuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2Nhcm91c2VsL2Nhcm91c2VsLmNvbXBvbmVudC50cyIsIi4uLy4uLy4uLy4uL3NyYy9jYXJvdXNlbC9jYXJvdXNlbC5jb21wb25lbnQuaHRtbCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFDSDs7Ozs7Ozs7R0FRRztBQUVILE9BQU8sRUFDTCxTQUFTLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQWEsTUFBTSxFQUFpQixNQUFNLEVBQUUsV0FBVyxFQUM5RixNQUFNLGVBQWUsQ0FBQztBQUN2QixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUUxRSxPQUFPLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBYyxNQUFNLHFCQUFxQixDQUFDO0FBRXZFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNuRCxPQUFPLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsTUFBTSxTQUFTLENBQUM7OztBQUdqRSxNQUFNLENBQU4sSUFBWSxTQUlYO0FBSkQsV0FBWSxTQUFTO0lBQ25CLCtDQUFPLENBQUE7SUFDUCx5Q0FBSSxDQUFBO0lBQ0oseUNBQUksQ0FBQTtBQUNOLENBQUMsRUFKVyxTQUFTLEtBQVQsU0FBUyxRQUlwQjtBQUVELElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQztBQUVuQjs7R0FFRztBQU9ILE1BQU0sT0FBTyxpQkFBaUI7SUE0QjVCLHdEQUF3RDtJQUN4RCxJQUNJLFdBQVcsQ0FBQyxLQUFhO1FBQzNCLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ25CLE9BQU87UUFDVCxDQUFDO1FBRUQsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNwQixJQUFJ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O2dCQXFCTixjQUFjO3NCQURiLEtBQUs7Z0JBUUYsUUFBUTtzQkFEWCxLQUFLIiwic291cmNlc0NvbnRlbnQiOlsiLyoqKlxuICogcGF1c2UgKG5vdCB5ZXQgc3VwcG9ydGVkKSAoP3N0cmluZz0naG92ZXInKSAtIGV2ZW50IGdyb3VwIG5hbWUgd2hpY2ggcGF1c2VzXG4gKiB0aGUgY3ljbGluZyBvZiB0aGUgY2Fyb3VzZWwsIGlmIGhvdmVyIHBhdXNlcyBvbiBtb3VzZWVudGVyIGFuZCByZXN1bWVzIG9uXG4gKiBtb3VzZWxlYXZlIGtleWJvYXJkIChub3QgeWV0IHN1cHBvcnRlZCkgKD9ib29sZWFuPXRydWUpIC0gaWYgZmFsc2VcbiAqIGNhcm91c2VsIHdpbGwgbm90IHJlYWN0IHRvIGtleWJvYXJkIGV2ZW50c1xuICogbm90ZTogc3dpcGluZyBub3QgeWV0IHN1cHBvcnRlZFxuICovXG4vKioqKlxuICogUHJvYmxlbXM6XG4gKiAxKSBpZiB3ZSBzZXQgYW4gYWN0aXZlIHNsaWRlIHZpYSBtb2RlbCBjaGFuZ2VzLCAuYWN0aXZlIGNsYXNzIHJlbWFpbnMgb24gYVxuICogY3VycmVudCBzbGlkZS5cbiAqIDIpIGlmIHdlIGhhdmUgb25seSBvbmUgc2xpZGUsIHdlIHNob3VsZG4ndCBzaG93IHByZXYvbmV4dCBuYXYgYnV0dG9uc1xuICogMykgaWYgZmlyc3Qgb3IgbGFzdCBzbGlkZSBpcyBhY3RpdmUgYW5kIG5vV3JhcCBpcyB0cnVlLCB0aGVyZSBzaG91bGQgYmVcbiAqIFwiZGlzYWJsZWRcIiBjbGFzcyBvbiB0aGUgbmF2IGJ1dHRvbnMuXG4gKiA0KSBkZWZhdWx0IGludGVydmFsIHNob3VsZCBiZSBlcXVhbCA1MDAwXG4gKi9cblxuaW1wb3J0IHtcbiAgQ29tcG9uZW50LCBFdmVudEVtaXR0ZXIsIElucHV0LCBOZ1pvbmUsIE9uRGVzdHJveSwgT3V0cHV0LCBBZnRlclZpZXdJbml0LCBJbmplY3QsIFBMQVRGT1JNX0lEXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgaXNQbGF0Zm9ybUJyb3dzZXIsIE5nSWYsIE5nRm9yLCBOZ1N0eWxlIH0gZnJvbSAnQGFuZ3VsYXIvY29tbW9uJztcblxuaW1wb3J0IHsgTGlua2VkTGlzdCwgZ2V0QnNWZXIsIElCc1ZlcnNpb24gfSBmcm9tICduZ3gtYm9vdHN0cmFwL3V0aWxzJztcbmltcG9ydCB7IFNsaWRlQ29tcG9uZW50IH0gZnJvbSAnLi9zbGlkZS5jb21wb25lbnQnO1xuaW1wb3J0IHsgQ2Fyb3VzZWxDb25maWcgfSBmcm9tICcuL2Nhcm91c2VsLmNvbmZpZyc7XG5pbXBvcnQgeyBmaW5kTGFzdEluZGV4LCBjaHVua0J5TnVtYmVyLCBpc051bWJlciB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgU2xpZGVXaXRoSW5kZXgsIEluZGV4ZWRTbGlkZUxpc3QgfSBmcm9tICcuL21vZGVscyc7XG5cbmV4cG9ydCBlbnVtIERpcmVjdGlvbiB7XG4gIFVOS05PV04sXG4gIE5FWFQsXG4gIFBSRVZcbn1cblxubGV0IF9jdXJyZW50SWQgPSAxO1xuXG4vKipcbiAqIEJhc2UgZWxlbWVudCB0byBjcmVhdGUgY2Fyb3VzZWxcbiAqL1xuQENvbXBvbmVudCh7XG4gICAgc2VsZWN0b3I6ICdjYXJvdXNlbCcsXG4gICAgdGVtcGxhdGVVcmw6ICcuL2Nhcm91c2VsLmNvbXBvbmVudC5odG1sJyxcbiAgICBzdGFuZGFsb25lOiB0cnVlLFxuICAgIGltcG9ydHM6IFtOZ0lmLCBOZ0ZvciwgTmdTdHlsZV1cbn0pXG5leHBvcnQgY2xhc3MgQ2Fyb3VzZWxDb21wb25lbnQgaW1wbGVtZW50cyBBZnRlclZpZXdJbml0LCBPbkRlc3Ryb3kge1xuICAvKiBJZiBgdHJ1ZWAg4oCUIGNhcm91c2VsIHdpbGwgbm90IGN5Y2xlIGNvbnRpbnVvdXNseSBhbmQgd2lsbCBoYXZlIGhhcmQgc3RvcHMgKHByZXZlbnQgbG9vcGluZykgKi9cbiAgQElucHV0KCkgbm9XcmFwID0gZmFsc2U7XG4gIC8qICBJZiBgdHJ1ZWAg4oCUIHdpbGwgZGlzYWJsZSBwYXVzaW5nIG9uIGNhcm91c2VsIG1vdXNlIGhvdmVyICovXG4gIEBJbnB1dCgpIG5vUGF1c2UgPSBmYWxzZTtcbiAgLyogIElmIGB0cnVlYCDigJQgY2Fyb3VzZWwtaW5kaWNhdG9ycyBhcmUgdmlzaWJsZSAgKi9cbiAgQElucHV0KCkgc2hvd0luZGljYXRvcnMgPSB0cnVlO1xuICAvKiAgSWYgYHRydWVgIC0gYXV0b3BsYXkgd2lsbCBiZSBzdG9wcGVkIG9uIGZvY3VzICovXG4gIEBJbnB1dCgpIHBhdXNlT25Gb2N1cyA9IGZhbHNlO1xuICAvKiBJZiBgdHJ1ZWAgLSBjYXJvdXNlbCBpbmRpY2F0b3JzIGluZGljYXRlIHNsaWRlcyBjaHVua3NcbiAgICAgd29ya3MgT05MWSBpZiBzaW5nbGVTbGlkZU9mZnNldCA9IEZBTFNFICovXG4gIEBJbnB1dCgpIGluZGljYXRvcnNCeUNodW5rID0gZmFsc2U7XG4gIC8qIElmIHZhbHVlIG1vcmUgdGhlbiAxIOKAlCBjYXJvdXNlbCB3b3JrcyBpbiBtdWx0aWxpc3QgbW9kZSAqL1xuICBASW5wdXQoKSBpdGVtc1BlclNsaWRlID0gMTtcbiAgLyogSWYgYHRydWVgIOKAlCBjYXJvdXNlbCBzaGlmdHMgYnkgb25lIGVsZW1lbnQuIEJ5IGRlZmF1bHQgY2Fyb3VzZWwgc2hpZnRzIGJ5IG51bWJlclxuICAgICBvZiB2aXNpYmxlIGVsZW1lbnRzIChpdGVtc1BlclNsaWRlIGZpZWxkKSAqL1xuICBASW5wdXQoKSBzaW5nbGVTbGlkZU9mZnNldCA9IGZhbHNlO1xuICAvKiogVHVybiBvbi9vZmYgYW5pbWF0aW9uLiBBbmltYXRpb24gZG9lc24ndCB3b3JrIGZvciBtdWx0aWxpc3QgY2Fyb3VzZWwgKi9cbiAgQElucHV0KCkgaXNBbmltYXRlZCA9IGZhbHNlO1xuXG4gIC8qKiBXaWxsIGJlIGVtaXR0ZWQgd2hlbiBhY3RpdmUgc2xpZGUgaGFzIGJlZW4gY2hhbmdlZC4gUGFydCBvZiB0d28td2F5LWJpbmRhYmxlIFsoYWN0aXZlU2xpZGUpXSBwcm9wZXJ0eSAqL1xuICBAT3V0cHV0KClcbiAgYWN0aXZlU2xpZGVDaGFuZ2UgPSBuZXcgRXZlbnRFbWl0dGVyPG51bWJlcj4oZmFsc2UpO1xuXG4gIC8qKiBXaWxsIGJlIGVtaXR0ZWQgd2hlbiBhY3RpdmUgc2xpZGVzIGhhcyBiZWVuIGNoYW5nZWQgaW4gbXVsdGlsaXN0IG1vZGUgKi9cbiAgQE91dHB1dCgpXG4gIHNsaWRlUmFuZ2VDaGFuZ2UgPSBuZXcgRXZlbnRFbWl0dGVyPG51bWJlcltdfHZvaWQ+KCk7XG5cbiAgLyoqIEluZGV4IG9mIGN1cnJlbnRseSBkaXNwbGF5ZWQgc2xpZGUoc3RhcnRlZCBmb3IgMCkgKi9cbiAgQElucHV0KClcbiAgc2V0IGFjdGl2ZVNsaWRlKGluZGV4OiBudW1iZXIpIHtcbiAgICBpZiAodGhpcy5tdWx0aWxpc3QpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoaXNOdW1iZXIoaW5kZXgpKSB7XG4gICAgICB0aGlzLmN1c3RvbUFjdGl2ZVNsaWRlID0gaW5kZXg7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3NsaWRlcy5sZW5ndGggJiYgaW5kZXggIT09IHRoaXMuX2N1cnJlbnRBY3RpdmVTbGlkZSkge1xuICAgICAgdGhpcy5fc2VsZWN0KGluZGV4KTtcbiAgICB9XG4gIH1cblxuICBnZXQgYWN0aXZlU2xpZGUoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fY3VycmVudEFjdGl2ZVNsaWRlIHx8IDA7XG4gIH1cblxuICAvKiBJbmRleCB0byBzdGFydCBkaXNwbGF5IHNsaWRlcyBmcm9tIGl0ICovXG4gIEBJbnB1dCgpXG4gIHN0YXJ0RnJvbUluZGV4ID0gMDtcblxuICAvKipcbiAgICogRGVsYXkgb2YgaXRlbSBjeWNsaW5nIGluIG1pbGxpc2Vjb25kcy4gSWYgZmFsc2UsIGNhcm91c2VsIHdvbid0IGN5Y2xlXG4gICAqIGF1dG9tYXRpY2FsbHkuXG4gICAqL1xuICBASW5wdXQoKVxuICBnZXQgaW50ZXJ2YWwoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5faW50ZXJ2YWw7XG4gIH1cblxuICBzZXQgaW50ZXJ2YWwodmFsdWU6IG51bWJlcikge1xuICAgIHRoaXMuX2ludGVydmFsID0gdmFsdWU7XG4gICAgdGhpcy5yZXN0YXJ0VGltZXIoKTtcbiAgfVxuXG4gIGdldCBzbGlkZXMoKTogU2xpZGVDb21wb25lbnRbXSB7XG4gICAgcmV0dXJuIHRoaXMuX3NsaWRlcy50b0FycmF5KCk7XG4gIH1cblxuICBnZXQgaXNGaXJzdFNsaWRlVmlzaWJsZSgpOiBib29sZWFuIHtcbiAgICBjb25zdCBpbmRleGVzID0gdGhpcy5nZXRWaXNpYmxlSW5kZXhlcygpO1xuICAgIGlmICghaW5kZXhlcyB8fCAoaW5kZXhlcyBpbnN0YW5jZW9mIEFycmF5ICYmICFpbmRleGVzLmxlbmd0aCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gaW5kZXhlcy5pbmNsdWRlcygwKTtcbiAgfVxuXG4gIGdldCBpc0xhc3RTbGlkZVZpc2libGUoKTogYm9vbGVhbiB7XG4gICAgY29uc3QgaW5kZXhlcyA9IHRoaXMuZ2V0VmlzaWJsZUluZGV4ZXMoKTtcbiAgICBpZiAoIWluZGV4ZXMgfHwgKGluZGV4ZXMgaW5zdGFuY2VvZiBBcnJheSAmJiAhaW5kZXhlcy5sZW5ndGgpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIGluZGV4ZXMuaW5jbHVkZXModGhpcy5fc2xpZGVzLmxlbmd0aCAtMSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgY3VycmVudEludGVydmFsPzogbnVtYmVyO1xuICBwcm90ZWN0ZWQgX2N1cnJlbnRBY3RpdmVTbGlkZT86IG51bWJlcjtcbiAgcHJvdGVjdGVkIF9pbnRlcnZhbCA9IDUwMDA7XG4gIHByb3RlY3RlZCBfc2xpZGVzOiBMaW5rZWRMaXN0PFNsaWRlQ29tcG9uZW50PiA9IG5ldyBMaW5rZWRMaXN0PFNsaWRlQ29tcG9uZW50PigpO1xuICBwcm90ZWN0ZWQgX2NodW5rZWRTbGlkZXM/OiBTbGlkZVdpdGhJbmRleFtdW107XG4gIHByb3RlY3RlZCBfc2xpZGVzV2l0aEluZGV4ZXM/OiBTbGlkZVdpdGhJbmRleFtdO1xuICBwcm90ZWN0ZWQgX2N1cnJlbnRWaXNpYmxlU2xpZGVzSW5kZXggPSAwO1xuICBwcm90ZWN0ZWQgaXNQbGF5aW5nID0gZmFsc2U7XG4gIHByb3RlY3RlZCBkZXN0cm95ZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSBjdXN0b21BY3RpdmVTbGlkZT86IG51bWJlcjtcbiAgY3VycmVudElkID0gMDtcblxuICBnZXQgX2JzVmVyKCk6IElCc1ZlcnNpb24ge1xuICAgIHJldHVybiBnZXRCc1ZlcigpO1xuICB9XG5cbiAgY29uc3RydWN0b3IoY29uZmlnOiBDYXJvdXNlbENvbmZpZywgcHJpdmF0ZSBuZ1pvbmU6IE5nWm9uZSwgQEluamVjdChQTEFURk9STV9JRCkgcHVibGljIHBsYXRmb3JtSWQ6IG51bWJlcikge1xuICAgIE9iamVjdC5hc3NpZ24odGhpcywgY29uZmlnKTtcbiAgICB0aGlzLmN1cnJlbnRJZCA9IF9jdXJyZW50SWQrKztcbiAgfVxuXG4gIG5nQWZ0ZXJWaWV3SW5pdCgpOiB2b2lkIHtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGlmICh0aGlzLnNpbmdsZVNsaWRlT2Zmc2V0KSB7XG4gICAgICAgIHRoaXMuaW5kaWNhdG9yc0J5Q2h1bmsgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLm11bHRpbGlzdCkge1xuICAgICAgICB0aGlzLl9jaHVua2VkU2xpZGVzID0gY2h1bmtCeU51bWJlcihcbiAgICAgICAgICB0aGlzLm1hcFNsaWRlc0FuZEluZGV4ZXMoKSxcbiAgICAgICAgICB0aGlzLml0ZW1zUGVyU2xpZGVcbiAgICAgICAgKTtcbiAgICAgICAgdGhpcy5zZWxlY3RJbml0aWFsU2xpZGVzKCk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLmN1c3RvbUFjdGl2ZVNsaWRlICYmICF0aGlzLm11bHRpbGlzdCkge1xuICAgICAgICB0aGlzLl9zZWxlY3QodGhpcy5jdXN0b21BY3RpdmVTbGlkZSk7XG4gICAgICB9XG4gICAgfSwgMCk7XG4gIH1cblxuICBuZ09uRGVzdHJveSgpOiB2b2lkIHtcbiAgICB0aGlzLmRlc3Ryb3llZCA9IHRydWU7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBuZXcgc2xpZGUuIElmIHRoaXMgc2xpZGUgaXMgZmlyc3QgaW4gY29sbGVjdGlvbiAtIHNldCBpdCBhcyBhY3RpdmVcbiAgICogYW5kIHN0YXJ0cyBhdXRvIGNoYW5naW5nXG4gICAqIEBwYXJhbSBzbGlkZVxuICAgKi9cbiAgYWRkU2xpZGUoc2xpZGU6IFNsaWRlQ29tcG9uZW50KTogdm9pZCB7XG4gICAgdGhpcy5fc2xpZGVzLmFkZChzbGlkZSk7XG5cbiAgICBpZiAodGhpcy5tdWx0aWxpc3QgJiYgdGhpcy5fc2xpZGVzLmxlbmd0aCA8PSB0aGlzLml0ZW1zUGVyU2xpZGUpIHtcbiAgICAgIHNsaWRlLmFjdGl2ZSA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLm11bHRpbGlzdCAmJiB0aGlzLmlzQW5pbWF0ZWQpIHtcbiAgICAgIHNsaWRlLmlzQW5pbWF0ZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5tdWx0aWxpc3QgJiYgdGhpcy5fc2xpZGVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgdGhpcy5fY3VycmVudEFjdGl2ZVNsaWRlID0gdW5kZWZpbmVkO1xuICAgICAgaWYgKCF0aGlzLmN1c3RvbUFjdGl2ZVNsaWRlKSB7XG4gICAgICAgIHRoaXMuYWN0aXZlU2xpZGUgPSAwO1xuICAgICAgfVxuICAgICAgdGhpcy5wbGF5KCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMubXVsdGlsaXN0ICYmIHRoaXMuX3NsaWRlcy5sZW5ndGggPiB0aGlzLml0ZW1zUGVyU2xpZGUpIHtcbiAgICAgIHRoaXMucGxheSgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIHNwZWNpZmllZCBzbGlkZS4gSWYgdGhpcyBzbGlkZSBpcyBhY3RpdmUgLSB3aWxsIHJvbGwgdG8gYW5vdGhlclxuICAgKiBzbGlkZVxuICAgKiBAcGFyYW0gc2xpZGVcbiAgICovXG4gIHJlbW92ZVNsaWRlKHNsaWRlOiBTbGlkZUNvbXBvbmVudCk6IHZvaWQge1xuICAgIGNvbnN0IHJlbUluZGV4ID0gdGhpcy5fc2xpZGVzLmluZGV4T2Yoc2xpZGUpO1xuXG4gICAgaWYgKHRoaXMuX2N1cnJlbnRBY3RpdmVTbGlkZSA9PT0gcmVtSW5kZXgpIHtcbiAgICAgIC8vIHJlbW92aW5nIG9mIGFjdGl2ZSBzbGlkZVxuICAgICAgbGV0IG5leHRTbGlkZUluZGV4OiBudW1iZXI7XG4gICAgICBpZiAodGhpcy5fc2xpZGVzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgLy8gaWYgdGhpcyBzbGlkZSBsYXN0IC0gd2lsbCByb2xsIHRvIGZpcnN0IHNsaWRlLCBpZiBub1dyYXAgZmxhZyBpc1xuICAgICAgICAvLyBGQUxTRSBvciB0byBwcmV2aW91cywgaWYgbm9XcmFwIGlzIFRSVUUgaW4gY2FzZSwgaWYgdGhpcyBzbGlkZSBpblxuICAgICAgICAvLyBtaWRkbGUgb2YgY29sbGVjdGlvbiwgaW5kZXggb2YgbmV4dCBzbGlkZSBpcyBzYW1lIHRvIHJlbW92ZWRcbiAgICAgICAgbmV4dFNsaWRlSW5kZXggPSAhdGhpcy5pc0xhc3QocmVtSW5kZXgpXG4gICAgICAgICAgPyByZW1JbmRleFxuICAgICAgICAgIDogdGhpcy5ub1dyYXAgPyByZW1JbmRleCAtIDEgOiAwO1xuICAgICAgfVxuICAgICAgdGhpcy5fc2xpZGVzLnJlbW92ZShyZW1JbmRleCk7XG5cbiAgICAgIC8vIHByZXZlbnRzIGV4Y2VwdGlvbiB3aXRoIGNoYW5naW5nIHNvbWUgdmFsdWUgYWZ0ZXIgY2hlY2tpbmdcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLl9zZWxlY3QobmV4dFNsaWRlSW5kZXgpO1xuICAgICAgfSwgMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3NsaWRlcy5yZW1vdmUocmVtSW5kZXgpO1xuICAgICAgY29uc3QgY3VycmVudFNsaWRlSW5kZXggPSB0aGlzLmdldEN1cnJlbnRTbGlkZUluZGV4KCk7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgLy8gYWZ0ZXIgcmVtb3ZpbmcsIG5lZWQgdG8gYWN0dWFsaXplIGluZGV4IG9mIGN1cnJlbnQgYWN0aXZlIHNsaWRlXG4gICAgICAgIHRoaXMuX2N1cnJlbnRBY3RpdmVTbGlkZSA9IGN1cnJlbnRTbGlkZUluZGV4O1xuICAgICAgICB0aGlzLmFjdGl2ZVNsaWRlQ2hhbmdlLmVtaXQodGhpcy5fY3VycmVudEFjdGl2ZVNsaWRlKTtcbiAgICAgIH0sIDApO1xuICAgIH1cbiAgfVxuXG4gIG5leHRTbGlkZUZyb21JbnRlcnZhbChmb3JjZSA9IGZhbHNlKTogdm9pZCB7XG4gICAgdGhpcy5tb3ZlKERpcmVjdGlvbi5ORVhULCBmb3JjZSk7XG4gIH1cblxuICAvKipcbiAgICogUm9sbGluZyB0byBuZXh0IHNsaWRlXG4gICAqIEBwYXJhbSBmb3JjZToge2Jvb2xlYW59IGlmIHRydWUgLSB3aWxsIGlnbm9yZSBub1dyYXAgZmxhZ1xuICAgKi9cbiAgbmV4dFNsaWRlKGZvcmNlID0gZmFsc2UpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5pc1BsYXlpbmcpIHtcbiAgICAgIHRoaXMucmVzdGFydFRpbWVyKCk7XG4gICAgfVxuICAgIHRoaXMubW92ZShEaXJlY3Rpb24uTkVYVCwgZm9yY2UpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJvbGxpbmcgdG8gcHJldmlvdXMgc2xpZGVcbiAgICogQHBhcmFtIGZvcmNlOiB7Ym9vbGVhbn0gaWYgdHJ1ZSAtIHdpbGwgaWdub3JlIG5vV3JhcCBmbGFnXG4gICAqL1xuICBwcmV2aW91c1NsaWRlKGZvcmNlID0gZmFsc2UpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5pc1BsYXlpbmcpIHtcbiAgICAgIHRoaXMucmVzdGFydFRpbWVyKCk7XG4gICAgfVxuICAgIHRoaXMubW92ZShEaXJlY3Rpb24uUFJFViwgZm9yY2UpO1xuICB9XG5cbiAgZ2V0Rmlyc3RWaXNpYmxlSW5kZXgoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5zbGlkZXMuZmluZEluZGV4KHRoaXMuZ2V0QWN0aXZlKTtcbiAgfVxuXG4gIGdldExhc3RWaXNpYmxlSW5kZXgoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gZmluZExhc3RJbmRleCh0aGlzLnNsaWRlcywgdGhpcy5nZXRBY3RpdmUpO1xuICB9XG5cbiAgZ2V0QWN0aXZlID0gKHNsaWRlOiBTbGlkZUNvbXBvbmVudCkgPT4gc2xpZGUuYWN0aXZlO1xuXG4gIG1vdmUoZGlyZWN0aW9uOiBEaXJlY3Rpb24sIGZvcmNlID0gZmFsc2UpOiB2b2lkIHtcbiAgICBjb25zdCBmaXJzdFZpc2libGVJbmRleCA9IHRoaXMuZ2V0Rmlyc3RWaXNpYmxlSW5kZXgoKTtcbiAgICBjb25zdCBsYXN0VmlzaWJsZUluZGV4ID0gdGhpcy5nZXRMYXN0VmlzaWJsZUluZGV4KCk7XG5cbiAgICBpZiAodGhpcy5ub1dyYXApIHtcbiAgICAgIGlmIChcbiAgICAgICAgZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTkVYVCAmJlxuICAgICAgICB0aGlzLmlzTGFzdChsYXN0VmlzaWJsZUluZGV4KSB8fFxuICAgICAgICBkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5QUkVWICYmXG4gICAgICAgIGZpcnN0VmlzaWJsZUluZGV4ID09PSAwXG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghdGhpcy5tdWx0aWxpc3QpIHtcbiAgICAgIHRoaXMuYWN0aXZlU2xpZGUgPSB0aGlzLmZpbmROZXh0U2xpZGVJbmRleChkaXJlY3Rpb24sIGZvcmNlKSB8fCAwO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm1vdmVNdWx0aWxpc3QoZGlyZWN0aW9uKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU3dpdGggc2xpZGVzIGJ5IGVudGVyLCBzcGFjZSBhbmQgYXJyb3dzIGtleXNcbiAgICogQGludGVybmFsXG4gICAqL1xuICBrZXlkb3duUHJlc3MoZXZlbnQ6IEtleWJvYXJkRXZlbnQpIHtcbiAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMgfHwgZXZlbnQua2V5ID09PSAnRW50ZXInIHx8IGV2ZW50LmtleUNvZGUgPT09IDMyIHx8IGV2ZW50LmtleSA9PT0gJ1NwYWNlJykge1xuICAgICAgdGhpcy5uZXh0U2xpZGUoKTtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMzcgfHwgZXZlbnQua2V5ID09PSAnTGVmdEFycm93Jykge1xuICAgICAgdGhpcy5wcmV2aW91c1NsaWRlKCk7XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMzkgfHwgZXZlbnQua2V5ID09PSAnUmlnaHRBcnJvdycpIHtcbiAgICAgIHRoaXMubmV4dFNsaWRlKCk7XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUGxheSBvbiBtb3VzZSBsZWF2ZVxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIG9uTW91c2VMZWF2ZSgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMucGF1c2VPbkZvY3VzKSB7XG4gICAgICB0aGlzLnBsYXkoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUGxheSBvbiBtb3VzZSB1cFxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIG9uTW91c2VVcCgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMucGF1c2VPbkZvY3VzKSB7XG4gICAgICB0aGlzLnBsYXkoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogV2hlbiBzbGlkZXMgb24gZm9jdXMgYXV0b3BsYXkgaXMgc3RvcHBlZChvcHRpb25hbClcbiAgICogQGludGVybmFsXG4gICAqL1xuICBwYXVzZUZvY3VzSW4oKTogdm9pZCB7XG4gICAgaWYgKHRoaXMucGF1c2VPbkZvY3VzKSB7XG4gICAgICB0aGlzLmlzUGxheWluZyA9IGZhbHNlO1xuICAgICAgdGhpcy5yZXNldFRpbWVyKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFdoZW4gc2xpZGVzIG91dCBvZiBmb2N1cyBhdXRvcGxheSBpcyBzdGFydGVkXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgcGF1c2VGb2N1c091dCgpOiB2b2lkIHtcbiAgICB0aGlzLnBsYXkoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSb2xsaW5nIHRvIHNwZWNpZmllZCBzbGlkZVxuICAgKiBAcGFyYW0gaW5kZXg6IHtudW1iZXJ9IGluZGV4IG9mIHNsaWRlLCB3aGljaCBtdXN0IGJlIHNob3duXG4gICAqL1xuICBzZWxlY3RTbGlkZShpbmRleDogbnVtYmVyKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaXNQbGF5aW5nKSB7XG4gICAgICB0aGlzLnJlc3RhcnRUaW1lcigpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5tdWx0aWxpc3QpIHtcbiAgICAgIHRoaXMuYWN0aXZlU2xpZGUgPSB0aGlzLmluZGljYXRvcnNCeUNodW5rID8gaW5kZXggKiB0aGlzLml0ZW1zUGVyU2xpZGUgOiBpbmRleDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zZWxlY3RTbGlkZVJhbmdlKHRoaXMuaW5kaWNhdG9yc0J5Q2h1bmsgPyBpbmRleCAqIHRoaXMuaXRlbXNQZXJTbGlkZSA6IGluZGV4KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU3RhcnRzIGEgYXV0byBjaGFuZ2luZyBvZiBzbGlkZXNcbiAgICovXG4gIHBsYXkoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmlzUGxheWluZykge1xuICAgICAgdGhpcy5pc1BsYXlpbmcgPSB0cnVlO1xuICAgICAgdGhpcy5yZXN0YXJ0VGltZXIoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU3RvcHMgYSBhdXRvIGNoYW5naW5nIG9mIHNsaWRlc1xuICAgKi9cbiAgcGF1c2UoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLm5vUGF1c2UpIHtcbiAgICAgIHRoaXMuaXNQbGF5aW5nID0gZmFsc2U7XG4gICAgICB0aGlzLnJlc2V0VGltZXIoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRmluZHMgYW5kIHJldHVybnMgaW5kZXggb2YgY3VycmVudGx5IGRpc3BsYXllZCBzbGlkZVxuICAgKi9cbiAgZ2V0Q3VycmVudFNsaWRlSW5kZXgoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fc2xpZGVzLmZpbmRJbmRleCh0aGlzLmdldEFjdGl2ZSk7XG4gIH1cblxuICAvKipcbiAgICogRGVmaW5lcywgd2hldGhlciB0aGUgc3BlY2lmaWVkIGluZGV4IGlzIGxhc3QgaW4gY29sbGVjdGlvblxuICAgKiBAcGFyYW0gaW5kZXhcbiAgICovXG4gIGlzTGFzdChpbmRleDogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGluZGV4ICsgMSA+PSB0aGlzLl9zbGlkZXMubGVuZ3RoO1xuICB9XG5cbiAgLyoqXG4gICAqIERlZmluZXMsIHdoZXRoZXIgdGhlIHNwZWNpZmllZCBpbmRleCBpcyBmaXJzdCBpbiBjb2xsZWN0aW9uXG4gICAqIEBwYXJhbSBpbmRleFxuICAgKi9cbiAgaXNGaXJzdChpbmRleDogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIGluZGV4ID09PSAwO1xuICB9XG5cbiAgaW5kaWNhdG9yc1NsaWRlcygpOiBTbGlkZUNvbXBvbmVudFtdIHtcbiAgICByZXR1cm4gdGhpcy5zbGlkZXMuZmlsdGVyKFxuICAgICAgKHNsaWRlOiBTbGlkZUNvbXBvbmVudCwgaW5kZXg6IG51bWJlcikgPT4gIXRoaXMuaW5kaWNhdG9yc0J5Q2h1bmsgfHwgaW5kZXggJSB0aGlzLml0ZW1zUGVyU2xpZGUgPT09IDBcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBzZWxlY3RJbml0aWFsU2xpZGVzKCk6IHZvaWQge1xuICAgIGNvbnN0IHN0YXJ0SW5kZXggPSB0aGlzLnN0YXJ0RnJvbUluZGV4IDw9IHRoaXMuX3NsaWRlcy5sZW5ndGhcbiAgICAgID8gdGhpcy5zdGFydEZyb21JbmRleFxuICAgICAgOiAwO1xuXG4gICAgdGhpcy5oaWRlU2xpZGVzKCk7XG5cbiAgICBpZiAodGhpcy5zaW5nbGVTbGlkZU9mZnNldCkge1xuICAgICAgdGhpcy5fc2xpZGVzV2l0aEluZGV4ZXMgPSB0aGlzLm1hcFNsaWRlc0FuZEluZGV4ZXMoKTtcblxuICAgICAgaWYgKHRoaXMuX3NsaWRlcy5sZW5ndGggLSBzdGFydEluZGV4IDwgdGhpcy5pdGVtc1BlclNsaWRlKSB7XG4gICAgICAgIGNvbnN0IHNsaWRlc1RvQXBwZW5kID0gdGhpcy5fc2xpZGVzV2l0aEluZGV4ZXMuc2xpY2UoMCwgc3RhcnRJbmRleCk7XG5cbiAgICAgICAgdGhpcy5fc2xpZGVzV2l0aEluZGV4ZXMgPSBbXG4gICAgICAgICAgLi4udGhpcy5fc2xpZGVzV2l0aEluZGV4ZXMsXG4gICAgICAgICAgLi4uc2xpZGVzVG9BcHBlbmRcbiAgICAgICAgXVxuICAgICAgICAgIC5zbGljZShzbGlkZXNUb0FwcGVuZC5sZW5ndGgpXG4gICAgICAgICAgLnNsaWNlKDAsIHRoaXMuaXRlbXNQZXJTbGlkZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9zbGlkZXNXaXRoSW5kZXhlcyA9IHRoaXMuX3NsaWRlc1dpdGhJbmRleGVzLnNsaWNlKFxuICAgICAgICAgIHN0YXJ0SW5kZXgsXG4gICAgICAgICAgc3RhcnRJbmRleCArIHRoaXMuaXRlbXNQZXJTbGlkZVxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9zbGlkZXNXaXRoSW5kZXhlcy5mb3JFYWNoKChzbGlkZTogU2xpZGVXaXRoSW5kZXgpID0+IHNsaWRlLml0ZW0uYWN0aXZlID0gdHJ1ZSk7XG4gICAgICB0aGlzLm1ha2VTbGlkZXNDb25zaXN0ZW50KHRoaXMuX3NsaWRlc1dpdGhJbmRleGVzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zZWxlY3RSYW5nZUJ5TmVzdGVkSW5kZXgoc3RhcnRJbmRleCk7XG4gICAgfVxuXG4gICAgdGhpcy5zbGlkZVJhbmdlQ2hhbmdlLmVtaXQodGhpcy5nZXRWaXNpYmxlSW5kZXhlcygpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWZpbmVzIG5leHQgc2xpZGUgaW5kZXgsIGRlcGVuZGluZyBvZiBkaXJlY3Rpb25cbiAgICogQHBhcmFtIGRpcmVjdGlvbjogRGlyZWN0aW9uKFVOS05PV058UFJFVnxORVhUKVxuICAgKiBAcGFyYW0gZm9yY2U6IHtib29sZWFufSBpZiBUUlVFIC0gd2lsbCBpZ25vcmUgbm9XcmFwIGZsYWcsIGVsc2Ugd2lsbFxuICAgKiAgIHJldHVybiB1bmRlZmluZWQgaWYgbmV4dCBzbGlkZSByZXF1aXJlIHdyYXBwaW5nXG4gICAqL1xuICBwcml2YXRlIGZpbmROZXh0U2xpZGVJbmRleChkaXJlY3Rpb246IERpcmVjdGlvbiwgZm9yY2U6IGJvb2xlYW4pOiBudW1iZXIgfCB2b2lkIHtcbiAgICBsZXQgbmV4dFNsaWRlSW5kZXggPSAwO1xuXG4gICAgaWYgKFxuICAgICAgIWZvcmNlICYmXG4gICAgICAodGhpcy5pc0xhc3QodGhpcy5hY3RpdmVTbGlkZSkgJiZcbiAgICAgICAgZGlyZWN0aW9uICE9PSBEaXJlY3Rpb24uUFJFViAmJlxuICAgICAgICB0aGlzLm5vV3JhcClcbiAgICApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKGRpcmVjdGlvbikge1xuICAgICAgY2FzZSBEaXJlY3Rpb24uTkVYVDpcbiAgICAgICAgLy8gaWYgdGhpcyBpcyBsYXN0IHNsaWRlLCBub3QgZm9yY2UsIGxvb3BpbmcgaXMgZGlzYWJsZWRcbiAgICAgICAgLy8gYW5kIG5lZWQgdG8gZ29pbmcgZm9yd2FyZCAtIHNlbGVjdCBjdXJyZW50IHNsaWRlLCBhcyBhIG5leHRcbiAgICAgICAgaWYgKHR5cGVvZiB0aGlzLl9jdXJyZW50QWN0aXZlU2xpZGUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgbmV4dFNsaWRlSW5kZXggPSAwO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5pc0xhc3QodGhpcy5fY3VycmVudEFjdGl2ZVNsaWRlKSkge1xuICAgICAgICAgIG5leHRTbGlkZUluZGV4ID0gdGhpcy5fY3VycmVudEFjdGl2ZVNsaWRlICsgMTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBuZXh0U2xpZGVJbmRleCA9ICFmb3JjZSAmJiB0aGlzLm5vV3JhcCA/IHRoaXMuX2N1cnJlbnRBY3RpdmVTbGlkZSA6IDA7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBEaXJlY3Rpb24uUFJFVjpcbiAgICAgICAgLy8gaWYgdGhpcyBpcyBmaXJzdCBzbGlkZSwgbm90IGZvcmNlLCBsb29waW5nIGlzIGRpc2FibGVkXG4gICAgICAgIC8vIGFuZCBuZWVkIHRvIGdvaW5nIGJhY2t3YXJkIC0gc2VsZWN0IGN1cnJlbnQgc2xpZGUsIGFzIGEgbmV4dFxuICAgICAgICBpZiAodHlwZW9mIHRoaXMuX2N1cnJlbnRBY3RpdmVTbGlkZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICBuZXh0U2xpZGVJbmRleCA9IDA7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX2N1cnJlbnRBY3RpdmVTbGlkZSA+IDApIHtcbiAgICAgICAgICBuZXh0U2xpZGVJbmRleCA9IHRoaXMuX2N1cnJlbnRBY3RpdmVTbGlkZSAtIDE7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFmb3JjZSAmJiB0aGlzLm5vV3JhcCkge1xuICAgICAgICAgIG5leHRTbGlkZUluZGV4ID0gdGhpcy5fY3VycmVudEFjdGl2ZVNsaWRlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIG5leHRTbGlkZUluZGV4ID0gdGhpcy5fc2xpZGVzLmxlbmd0aCAtIDE7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGRpcmVjdGlvbicpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXh0U2xpZGVJbmRleDtcbiAgfVxuXG4gIHByaXZhdGUgbWFwU2xpZGVzQW5kSW5kZXhlcygpOiBTbGlkZVdpdGhJbmRleFtdIHtcbiAgICByZXR1cm4gdGhpcy5zbGlkZXNcbiAgICAgIC5zbGljZSgpXG4gICAgICAubWFwKChzbGlkZTogU2xpZGVDb21wb25lbnQsIGluZGV4OiBudW1iZXIpID0+IHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBpbmRleCxcbiAgICAgICAgICBpdGVtOiBzbGlkZVxuICAgICAgICB9O1xuICAgICAgfSk7XG4gIH1cblxuXG4gIHByaXZhdGUgc2VsZWN0U2xpZGVSYW5nZShpbmRleDogbnVtYmVyKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaXNJbmRleEluUmFuZ2UoaW5kZXgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5oaWRlU2xpZGVzKCk7XG5cbiAgICBpZiAoIXRoaXMuc2luZ2xlU2xpZGVPZmZzZXQpIHtcbiAgICAgIHRoaXMuc2VsZWN0UmFuZ2VCeU5lc3RlZEluZGV4KGluZGV4KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc3RhcnRJbmRleCA9IHRoaXMuaXNJbmRleE9uVGhlRWRnZXMoaW5kZXgpXG4gICAgICAgID8gaW5kZXhcbiAgICAgICAgOiBpbmRleCAtIHRoaXMuaXRlbXNQZXJTbGlkZSArIDE7XG5cbiAgICAgIGNvbnN0IGVuZEluZGV4ID0gdGhpcy5pc0luZGV4T25UaGVFZGdlcyhpbmRleClcbiAgICAgICAgPyBpbmRleCArIHRoaXMuaXRlbXNQZXJTbGlkZVxuICAgICAgICA6IGluZGV4ICsgMTtcblxuICAgICAgdGhpcy5fc2xpZGVzV2l0aEluZGV4ZXMgPSB0aGlzLm1hcFNsaWRlc0FuZEluZGV4ZXMoKS5zbGljZShzdGFydEluZGV4LCBlbmRJbmRleCk7XG4gICAgICB0aGlzLm1ha2VTbGlkZXNDb25zaXN0ZW50KHRoaXMuX3NsaWRlc1dpdGhJbmRleGVzKTtcblxuICAgICAgdGhpcy5fc2xpZGVzV2l0aEluZGV4ZXMuZm9yRWFjaCgoc2xpZGU6IFNsaWRlV2l0aEluZGV4KSA9PiBzbGlkZS5pdGVtLmFjdGl2ZSA9IHRydWUpO1xuICAgIH1cblxuICAgIHRoaXMuc2xpZGVSYW5nZUNoYW5nZS5lbWl0KHRoaXMuZ2V0VmlzaWJsZUluZGV4ZXMoKSk7XG4gIH1cblxuICBwcml2YXRlIHNlbGVjdFJhbmdlQnlOZXN0ZWRJbmRleChpbmRleDogbnVtYmVyKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLl9jaHVua2VkU2xpZGVzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qgc2VsZWN0ZWRSYW5nZSA9IHRoaXMuX2NodW5rZWRTbGlkZXNcbiAgICAgIC5tYXAoKHNsaWRlc0xpc3QsIGk6IG51bWJlcikgPT4ge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGluZGV4OiBpLFxuICAgICAgICAgIGxpc3Q6IHNsaWRlc0xpc3RcbiAgICAgICAgfTtcbiAgICAgIH0pXG4gICAgICAuZmluZChcbiAgICAgICAgKHNsaWRlc0xpc3Q6IEluZGV4ZWRTbGlkZUxpc3QpID0+IHtcbiAgICAgICAgICByZXR1cm4gc2xpZGVzTGlzdC5saXN0LmZpbmQoc2xpZGUgPT4gc2xpZGUuaW5kZXggPT09IGluZGV4KSAhPT0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICApO1xuXG4gICAgaWYgKCFzZWxlY3RlZFJhbmdlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5fY3VycmVudFZpc2libGVTbGlkZXNJbmRleCA9IHNlbGVjdGVkUmFuZ2UuaW5kZXg7XG5cbiAgICB0aGlzLl9jaHVua2VkU2xpZGVzW3NlbGVjdGVkUmFuZ2UuaW5kZXhdLmZvckVhY2goKHNsaWRlOiBTbGlkZVdpdGhJbmRleCkgPT4ge1xuICAgICAgc2xpZGUuaXRlbS5hY3RpdmUgPSB0cnVlO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBpc0luZGV4T25UaGVFZGdlcyhpbmRleDogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIChcbiAgICAgIGluZGV4ICsgMSAtIHRoaXMuaXRlbXNQZXJTbGlkZSA8PSAwIHx8XG4gICAgICBpbmRleCArIHRoaXMuaXRlbXNQZXJTbGlkZSA8PSB0aGlzLl9zbGlkZXMubGVuZ3RoXG4gICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgaXNJbmRleEluUmFuZ2UoaW5kZXg6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLnNpbmdsZVNsaWRlT2Zmc2V0ICYmIHRoaXMuX3NsaWRlc1dpdGhJbmRleGVzKSB7XG4gICAgICBjb25zdCB2aXNpYmxlSW5kZXhlcyA9IHRoaXMuX3NsaWRlc1dpdGhJbmRleGVzLm1hcCgoc2xpZGU6IFNsaWRlV2l0aEluZGV4KSA9PiBzbGlkZS5pbmRleCk7XG5cbiAgICAgIHJldHVybiB2aXNpYmxlSW5kZXhlcy5pbmRleE9mKGluZGV4KSA+PSAwO1xuICAgIH1cblxuICAgIHJldHVybiAoXG4gICAgICBpbmRleCA8PSB0aGlzLmdldExhc3RWaXNpYmxlSW5kZXgoKSAmJlxuICAgICAgaW5kZXggPj0gdGhpcy5nZXRGaXJzdFZpc2libGVJbmRleCgpXG4gICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgaGlkZVNsaWRlcygpOiB2b2lkIHtcbiAgICB0aGlzLnNsaWRlcy5mb3JFYWNoKChzbGlkZTogU2xpZGVDb21wb25lbnQpID0+IHNsaWRlLmFjdGl2ZSA9IGZhbHNlKTtcbiAgfVxuXG4gIHByaXZhdGUgaXNWaXNpYmxlU2xpZGVMaXN0TGFzdCgpOiBib29sZWFuIHtcbiAgICBpZiAoIXRoaXMuX2NodW5rZWRTbGlkZXMpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fY3VycmVudFZpc2libGVTbGlkZXNJbmRleCA9PT0gdGhpcy5fY2h1bmtlZFNsaWRlcy5sZW5ndGggLSAxO1xuICB9XG5cbiAgcHJpdmF0ZSBpc1Zpc2libGVTbGlkZUxpc3RGaXJzdCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fY3VycmVudFZpc2libGVTbGlkZXNJbmRleCA9PT0gMDtcbiAgfVxuXG4gIHByaXZhdGUgbW92ZVNsaWRlckJ5T25lSXRlbShkaXJlY3Rpb246IERpcmVjdGlvbik6IHZvaWQge1xuICAgIGxldCBmaXJzdFZpc2libGVJbmRleDogbnVtYmVyO1xuICAgIGxldCBsYXN0VmlzaWJsZUluZGV4OiBudW1iZXI7XG4gICAgbGV0IGluZGV4VG9IaWRlOiBudW1iZXI7XG4gICAgbGV0IGluZGV4VG9TaG93OiBudW1iZXI7XG5cbiAgICBpZiAodGhpcy5ub1dyYXApIHtcbiAgICAgIGZpcnN0VmlzaWJsZUluZGV4ID0gdGhpcy5nZXRGaXJzdFZpc2libGVJbmRleCgpO1xuICAgICAgbGFzdFZpc2libGVJbmRleCA9IHRoaXMuZ2V0TGFzdFZpc2libGVJbmRleCgpO1xuXG4gICAgICBpbmRleFRvSGlkZSA9IGRpcmVjdGlvbiA9PT0gRGlyZWN0aW9uLk5FWFRcbiAgICAgICAgPyBmaXJzdFZpc2libGVJbmRleFxuICAgICAgICA6IGxhc3RWaXNpYmxlSW5kZXg7XG5cbiAgICAgIGluZGV4VG9TaG93ID0gZGlyZWN0aW9uICE9PSBEaXJlY3Rpb24uTkVYVFxuICAgICAgICA/IGZpcnN0VmlzaWJsZUluZGV4IC0gMVxuICAgICAgICA6ICF0aGlzLmlzTGFzdChsYXN0VmlzaWJsZUluZGV4KVxuICAgICAgICAgID8gbGFzdFZpc2libGVJbmRleCArIDEgOiAwO1xuXG4gICAgICBjb25zdCBzbGlkZVRvSGlkZSA9IHRoaXMuX3NsaWRlcy5nZXQoaW5kZXhUb0hpZGUpO1xuICAgICAgaWYgKHNsaWRlVG9IaWRlKSB7XG4gICAgICAgIHNsaWRlVG9IaWRlLmFjdGl2ZSA9IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBzbGlkZVRvU2hvdyA9IHRoaXMuX3NsaWRlcy5nZXQoaW5kZXhUb1Nob3cpO1xuICAgICAgaWYgKHNsaWRlVG9TaG93KSB7XG4gICAgICAgIHNsaWRlVG9TaG93LmFjdGl2ZSA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHNsaWRlc1RvUmVvcmRlciA9IHRoaXMubWFwU2xpZGVzQW5kSW5kZXhlcygpLmZpbHRlcihcbiAgICAgICAgKHNsaWRlOiBTbGlkZVdpdGhJbmRleCkgPT4gc2xpZGUuaXRlbS5hY3RpdmVcbiAgICAgICk7XG5cbiAgICAgIHRoaXMubWFrZVNsaWRlc0NvbnNpc3RlbnQoc2xpZGVzVG9SZW9yZGVyKTtcbiAgICAgIGlmICh0aGlzLnNpbmdsZVNsaWRlT2Zmc2V0KSB7XG4gICAgICAgIHRoaXMuX3NsaWRlc1dpdGhJbmRleGVzID0gc2xpZGVzVG9SZW9yZGVyO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnNsaWRlUmFuZ2VDaGFuZ2UuZW1pdCh0aGlzLmdldFZpc2libGVJbmRleGVzKCkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5fc2xpZGVzV2l0aEluZGV4ZXMgfHwgIXRoaXMuX3NsaWRlc1dpdGhJbmRleGVzWzBdKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IGluZGV4OiBudW1iZXI7XG5cbiAgICBmaXJzdFZpc2libGVJbmRleCA9IHRoaXMuX3NsaWRlc1dpdGhJbmRleGVzWzBdLmluZGV4O1xuICAgIGxhc3RWaXNpYmxlSW5kZXggPSB0aGlzLl9zbGlkZXNXaXRoSW5kZXhlc1t0aGlzLl9zbGlkZXNXaXRoSW5kZXhlcy5sZW5ndGggLSAxXS5pbmRleDtcblxuICAgIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ORVhUKSB7XG4gICAgICB0aGlzLl9zbGlkZXNXaXRoSW5kZXhlcy5zaGlmdCgpO1xuXG4gICAgICBpbmRleCA9IHRoaXMuaXNMYXN0KGxhc3RWaXNpYmxlSW5kZXgpXG4gICAgICAgID8gMFxuICAgICAgICA6IGxhc3RWaXNpYmxlSW5kZXggKyAxO1xuXG4gICAgICBjb25zdCBpdGVtID0gdGhpcy5fc2xpZGVzLmdldChpbmRleCk7XG5cbiAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgIHRoaXMuX3NsaWRlc1dpdGhJbmRleGVzLnB1c2goeyBpbmRleCwgaXRlbSB9KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fc2xpZGVzV2l0aEluZGV4ZXMucG9wKCk7XG4gICAgICBpbmRleCA9IHRoaXMuaXNGaXJzdChmaXJzdFZpc2libGVJbmRleClcbiAgICAgICAgPyB0aGlzLl9zbGlkZXMubGVuZ3RoIC0gMVxuICAgICAgICA6IGZpcnN0VmlzaWJsZUluZGV4IC0gMTtcblxuICAgICAgY29uc3QgaXRlbSA9IHRoaXMuX3NsaWRlcy5nZXQoaW5kZXgpO1xuICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgdGhpcy5fc2xpZGVzV2l0aEluZGV4ZXMgPSBbeyBpbmRleCwgaXRlbSB9LCAuLi50aGlzLl9zbGlkZXNXaXRoSW5kZXhlc107XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5oaWRlU2xpZGVzKCk7XG5cbiAgICB0aGlzLl9zbGlkZXNXaXRoSW5kZXhlcy5mb3JFYWNoKHNsaWRlID0+IHNsaWRlLml0ZW0uYWN0aXZlID0gdHJ1ZSk7XG4gICAgdGhpcy5tYWtlU2xpZGVzQ29uc2lzdGVudCh0aGlzLl9zbGlkZXNXaXRoSW5kZXhlcyk7XG5cbiAgICB0aGlzLnNsaWRlUmFuZ2VDaGFuZ2UuZW1pdChcbiAgICAgIHRoaXMuX3NsaWRlc1dpdGhJbmRleGVzLm1hcCgoc2xpZGU6IFNsaWRlV2l0aEluZGV4KSA9PiBzbGlkZS5pbmRleClcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBtYWtlU2xpZGVzQ29uc2lzdGVudCA9IChzbGlkZXM6IFNsaWRlV2l0aEluZGV4W10pOiB2b2lkID0+IHtcbiAgICBzbGlkZXMuZm9yRWFjaCgoc2xpZGU6IFNsaWRlV2l0aEluZGV4LCBpbmRleDogbnVtYmVyKSA9PiBzbGlkZS5pdGVtLm9yZGVyID0gaW5kZXgpO1xuICB9O1xuXG4gIHByaXZhdGUgbW92ZU11bHRpbGlzdChkaXJlY3Rpb246IERpcmVjdGlvbik6IHZvaWQge1xuICAgIGlmICh0aGlzLnNpbmdsZVNsaWRlT2Zmc2V0KSB7XG4gICAgICB0aGlzLm1vdmVTbGlkZXJCeU9uZUl0ZW0oZGlyZWN0aW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5oaWRlU2xpZGVzKCk7XG5cbiAgICAgIGlmICh0aGlzLm5vV3JhcCkge1xuICAgICAgICB0aGlzLl9jdXJyZW50VmlzaWJsZVNsaWRlc0luZGV4ID0gZGlyZWN0aW9uID09PSBEaXJlY3Rpb24uTkVYVFxuICAgICAgICAgID8gdGhpcy5fY3VycmVudFZpc2libGVTbGlkZXNJbmRleCArIDFcbiAgICAgICAgICA6IHRoaXMuX2N1cnJlbnRWaXNpYmxlU2xpZGVzSW5kZXggLSAxO1xuICAgICAgfSBlbHNlIGlmIChkaXJlY3Rpb24gPT09IERpcmVjdGlvbi5ORVhUKSB7XG4gICAgICAgIHRoaXMuX2N1cnJlbnRWaXNpYmxlU2xpZGVzSW5kZXggPSB0aGlzLmlzVmlzaWJsZVNsaWRlTGlzdExhc3QoKVxuICAgICAgICAgID8gMFxuICAgICAgICAgIDogdGhpcy5fY3VycmVudFZpc2libGVTbGlkZXNJbmRleCArIDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodGhpcy5pc1Zpc2libGVTbGlkZUxpc3RGaXJzdCgpKSB7XG4gICAgICAgICAgdGhpcy5fY3VycmVudFZpc2libGVTbGlkZXNJbmRleCA9IHRoaXMuX2NodW5rZWRTbGlkZXNcbiAgICAgICAgICAgID8gdGhpcy5fY2h1bmtlZFNsaWRlcy5sZW5ndGggLSAxXG4gICAgICAgICAgICA6IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fY3VycmVudFZpc2libGVTbGlkZXNJbmRleCA9IHRoaXMuX2N1cnJlbnRWaXNpYmxlU2xpZGVzSW5kZXggLSAxO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl9jaHVua2VkU2xpZGVzKSB7XG4gICAgICAgIHRoaXMuX2NodW5rZWRTbGlkZXNbdGhpcy5fY3VycmVudFZpc2libGVTbGlkZXNJbmRleF0uZm9yRWFjaChcbiAgICAgICAgICAoc2xpZGU6IFNsaWRlV2l0aEluZGV4KSA9PiBzbGlkZS5pdGVtLmFjdGl2ZSA9IHRydWVcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuc2xpZGVSYW5nZUNoYW5nZS5lbWl0KHRoaXMuZ2V0VmlzaWJsZUluZGV4ZXMoKSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRWaXNpYmxlSW5kZXhlcygpOiBudW1iZXJbXSB8IHZvaWQge1xuICAgIGlmICghdGhpcy5zaW5nbGVTbGlkZU9mZnNldCAmJiB0aGlzLl9jaHVua2VkU2xpZGVzKSB7XG4gICAgICByZXR1cm4gdGhpcy5fY2h1bmtlZFNsaWRlc1t0aGlzLl9jdXJyZW50VmlzaWJsZVNsaWRlc0luZGV4XVxuICAgICAgICAubWFwKChzbGlkZTogU2xpZGVXaXRoSW5kZXgpID0+IHNsaWRlLmluZGV4KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fc2xpZGVzV2l0aEluZGV4ZXMpIHtcbiAgICAgIHJldHVybiB0aGlzLl9zbGlkZXNXaXRoSW5kZXhlcy5tYXAoKHNsaWRlOiBTbGlkZVdpdGhJbmRleCkgPT4gc2xpZGUuaW5kZXgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIGEgc2xpZGUsIHdoaWNoIHNwZWNpZmllZCB0aHJvdWdoIGluZGV4LCBhcyBhY3RpdmVcbiAgICogQHBhcmFtIGluZGV4XG4gICAqL1xuICBwcml2YXRlIF9zZWxlY3QoaW5kZXg6IG51bWJlcik6IHZvaWQge1xuICAgIGlmIChpc05hTihpbmRleCkpIHtcbiAgICAgIHRoaXMucGF1c2UoKTtcblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5tdWx0aWxpc3QgJiYgdHlwZW9mIHRoaXMuX2N1cnJlbnRBY3RpdmVTbGlkZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGNvbnN0IGN1cnJlbnRTbGlkZSA9IHRoaXMuX3NsaWRlcy5nZXQodGhpcy5fY3VycmVudEFjdGl2ZVNsaWRlKTtcbiAgICAgIGlmICh0eXBlb2YgY3VycmVudFNsaWRlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBjdXJyZW50U2xpZGUuYWN0aXZlID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgbmV4dFNsaWRlID0gdGhpcy5fc2xpZGVzLmdldChpbmRleCk7XG5cbiAgICBpZiAodHlwZW9mIG5leHRTbGlkZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRoaXMuX2N1cnJlbnRBY3RpdmVTbGlkZSA9IGluZGV4O1xuICAgICAgbmV4dFNsaWRlLmFjdGl2ZSA9IHRydWU7XG4gICAgICB0aGlzLmFjdGl2ZVNsaWRlID0gaW5kZXg7XG4gICAgICB0aGlzLmFjdGl2ZVNsaWRlQ2hhbmdlLmVtaXQoaW5kZXgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTdGFydHMgbG9vcCBvZiBhdXRvIGNoYW5naW5nIG9mIHNsaWRlc1xuICAgKi9cbiAgcHJpdmF0ZSByZXN0YXJ0VGltZXIoKSB7XG4gICAgdGhpcy5yZXNldFRpbWVyKCk7XG4gICAgY29uc3QgaW50ZXJ2YWwgPSArdGhpcy5pbnRlcnZhbDtcbiAgICBpZiAoIWlzTmFOKGludGVydmFsKSAmJiBpbnRlcnZhbCA+IDAgJiYgaXNQbGF0Zm9ybUJyb3dzZXIodGhpcy5wbGF0Zm9ybUlkKSkge1xuICAgICAgdGhpcy5jdXJyZW50SW50ZXJ2YWwgPSB0aGlzLm5nWm9uZS5ydW5PdXRzaWRlQW5ndWxhcjxudW1iZXI+KCgpID0+IHtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5zZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgY29uc3QgbkludGVydmFsID0gK3RoaXMuaW50ZXJ2YWw7XG4gICAgICAgICAgdGhpcy5uZ1pvbmUucnVuKCgpID0+IHtcbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgdGhpcy5pc1BsYXlpbmcgJiZcbiAgICAgICAgICAgICAgIWlzTmFOKHRoaXMuaW50ZXJ2YWwpICYmXG4gICAgICAgICAgICAgIG5JbnRlcnZhbCA+IDAgJiZcbiAgICAgICAgICAgICAgdGhpcy5zbGlkZXMubGVuZ3RoXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgdGhpcy5uZXh0U2xpZGVGcm9tSW50ZXJ2YWwoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRoaXMucGF1c2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSwgaW50ZXJ2YWwpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgZ2V0IG11bHRpbGlzdCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5pdGVtc1BlclNsaWRlID4gMTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTdG9wcyBsb29wIG9mIGF1dG8gY2hhbmdpbmcgb2Ygc2xpZGVzXG4gICAqL1xuICBwcml2YXRlIHJlc2V0VGltZXIoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuY3VycmVudEludGVydmFsKSB7XG4gICAgICBjbGVhckludGVydmFsKHRoaXMuY3VycmVudEludGVydmFsKTtcbiAgICAgIHRoaXMuY3VycmVudEludGVydmFsID0gdm9pZCAwO1xuICAgIH1cbiAgfVxuXG4gIGNoZWNrRGlzYWJsZWRDbGFzcyhidXR0b25UeXBlOiAncHJldicgfCAnbmV4dCcpOiBib29sZWFuIHtcbiAgICBpZiAoYnV0dG9uVHlwZSA9PT0gJ3ByZXYnKSB7XG4gICAgICByZXR1cm4gKHRoaXMuYWN0aXZlU2xpZGUgPT09IDAgJiYgdGhpcy5ub1dyYXAgJiYgIXRoaXMubXVsdGlsaXN0KSB8fCAodGhpcy5pc0ZpcnN0U2xpZGVWaXNpYmxlICYmIHRoaXMubm9XcmFwICYmIHRoaXMubXVsdGlsaXN0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gKHRoaXMuaXNMYXN0KHRoaXMuYWN0aXZlU2xpZGUpICYmIHRoaXMubm9XcmFwICYmICF0aGlzLm11bHRpbGlzdCkgfHwgKHRoaXMuaXNMYXN0U2xpZGVWaXNpYmxlICYmIHRoaXMubm9XcmFwICYmIHRoaXMubXVsdGlsaXN0KTtcbiAgfVxufVxuIiwiPGRpdiAobW91c2VlbnRlcik9XCJwYXVzZSgpXCJcbiAgICAgKG1vdXNlbGVhdmUpPVwib25Nb3VzZUxlYXZlKClcIlxuICAgICAobW91c2V1cCk9XCJvbk1vdXNlVXAoKVwiXG4gICAgIChrZXlkb3duKT1cImtleWRvd25QcmVzcygkZXZlbnQpXCJcbiAgICAgKGZvY3VzaW4pPVwicGF1c2VGb2N1c0luKClcIlxuICAgICAoZm9jdXNvdXQpPVwicGF1c2VGb2N1c091dCgpXCJcbiAgICAgW2lkXT1cIidjYXJvdXNlbCcgKyBjdXJyZW50SWRcIlxuICAgICBjbGFzcz1cImNhcm91c2VsIHNsaWRlXCIgdGFiaW5kZXg9XCIwXCI+XG4gIDxuZy1jb250YWluZXIgKm5nSWY9XCIhX2JzVmVyLmlzQnM1ICYmIHNob3dJbmRpY2F0b3JzICYmIHNsaWRlcy5sZW5ndGggPiAxXCI+XG4gICAgPG9sIGNsYXNzPVwiY2Fyb3VzZWwtaW5kaWNhdG9yc1wiPlxuICAgICAgPGxpICpuZ0Zvcj1cImxldCBzbGlkZSBvZiBpbmRpY2F0b3JzU2xpZGVzKCk7IGxldCBpID0gaW5kZXg7XCJcbiAgICAgICAgICBbY2xhc3MuYWN0aXZlXT1cInNsaWRlLmFjdGl2ZSA9PT0gdHJ1ZVwiXG4gICAgICAgICAgKGNsaWNrKT1cInNlbGVjdFNsaWRlKGkpXCI+XG4gICAgICA8L2xpPlxuICAgIDwvb2w+XG4gIDwvbmctY29udGFpbmVyPlxuICA8bmctY29udGFpbmVyICpuZ0lmPVwiX2JzVmVyLmlzQnM1ICYmIHNob3dJbmRpY2F0b3JzICYmIHNsaWRlcy5sZW5ndGggPiAxXCI+XG4gICAgPGRpdiBjbGFzcz1cImNhcm91c2VsLWluZGljYXRvcnNcIj5cbiAgICAgIDxidXR0b25cbiAgICAgICAgKm5nRm9yPVwibGV0IHNsaWRlIG9mIGluZGljYXRvcnNTbGlkZXMoKTsgbGV0IGkgPSBpbmRleDtcIlxuICAgICAgICBbY2xhc3MuYWN0aXZlXT1cInNsaWRlLmFjdGl2ZSA9PT0gdHJ1ZVwiXG4gICAgICAgIChjbGljayk9XCJzZWxlY3RTbGlkZShpKVwiXG4gICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICBbYXR0ci5kYXRhLWJzLXRhcmdldF09XCInI2Nhcm91c2VsJyArIGN1cnJlbnRJZFwiXG4gICAgICAgIFthdHRyLmRhdGEtYnMtc2xpZGUtdG9dPVwiaVwiIGFyaWEtY3VycmVudD1cInRydWVcIlxuICAgICAgPlxuICAgICAgPC9idXR0b24+XG4gICAgPC9kaXY+XG4gIDwvbmctY29udGFpbmVyPlxuICA8ZGl2IGNsYXNzPVwiY2Fyb3VzZWwtaW5uZXJcIiBbbmdTdHlsZV09XCJ7J2Rpc3BsYXknOiBtdWx0aWxpc3QgPyAnZmxleCcgOiAnYmxvY2snfVwiPlxuICAgIDxuZy1jb250ZW50PjwvbmctY29udGVudD5cbiAgPC9kaXY+XG4gIDxhIGNsYXNzPVwibGVmdCBjYXJvdXNlbC1jb250cm9sIGNhcm91c2VsLWNvbnRyb2wtcHJldlwiXG4gICAgIGhyZWY9XCJqYXZhc2NyaXB0OnZvaWQoMCk7XCJcbiAgICAgW2NsYXNzLmRpc2FibGVkXT1cImNoZWNrRGlzYWJsZWRDbGFzcygncHJldicpXCJcbiAgICAgW2F0dHIuZGF0YS1icy10YXJnZXRdPVwiJyNjYXJvdXNlbCcgKyBjdXJyZW50SWRcIlxuICAgICAqbmdJZj1cInNsaWRlcy5sZW5ndGggPiAxXCJcbiAgICAgKGNsaWNrKT1cInByZXZpb3VzU2xpZGUoKVwiXG4gICAgIHRhYmluZGV4PVwiMFwiIHJvbGU9XCJidXR0b25cIj5cbiAgICA8c3BhbiBjbGFzcz1cImljb24tcHJldiBjYXJvdXNlbC1jb250cm9sLXByZXYtaWNvblwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPjwvc3Bhbj5cbiAgICA8c3BhbiBjbGFzcz1cInNyLW9ubHkgdmlzdWFsbHktaGlkZGVuXCI+UHJldmlvdXM8L3NwYW4+XG4gIDwvYT5cblxuICA8YSBjbGFzcz1cInJpZ2h0IGNhcm91c2VsLWNvbnRyb2wgY2Fyb3VzZWwtY29udHJvbC1uZXh0XCJcbiAgICAgaHJlZj1cImphdmFzY3JpcHQ6dm9pZCgwKTtcIlxuICAgICAqbmdJZj1cInNsaWRlcy5sZW5ndGggPiAxXCJcbiAgICAgKGNsaWNrKT1cIm5leHRTbGlkZSgpXCJcbiAgICAgW2NsYXNzLmRpc2FibGVkXT1cImNoZWNrRGlzYWJsZWRDbGFzcygnbmV4dCcpXCJcbiAgICAgW2F0dHIuZGF0YS1icy10YXJnZXRdPVwiJyNjYXJvdXNlbCcgKyBjdXJyZW50SWRcIlxuICAgICB0YWJpbmRleD1cIjBcIiByb2xlPVwiYnV0dG9uXCI+XG4gICAgPHNwYW4gY2xhc3M9XCJpY29uLW5leHQgY2Fyb3VzZWwtY29udHJvbC1uZXh0LWljb25cIiBhcmlhLWhpZGRlbj1cInRydWVcIj48L3NwYW4+XG4gICAgPHNwYW4gY2xhc3M9XCJzci1vbmx5IHZpc3VhbGx5LWhpZGRlblwiPk5leHQ8L3NwYW4+XG4gIDwvYT5cbjwvZGl2PlxuIl19