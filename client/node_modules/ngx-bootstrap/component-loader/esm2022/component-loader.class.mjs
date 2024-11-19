// todo: add delay support
// todo: merge events onShow, onShown, etc...
// todo: add global positioning configuration?
import { ElementRef, EventEmitter, Injector, TemplateRef } from '@angular/core';
import { listenToTriggersV2, registerEscClick, registerOutsideClick } from 'ngx-bootstrap/utils';
import { ContentRef } from './content-ref.class';
export class ComponentLoader {
    /**
     * Do not use this directly, it should be instanced via
     * `ComponentLoadFactory.attach`
     * @internal
     */
    constructor(_viewContainerRef, _renderer, _elementRef, _injector, _componentFactoryResolver, _ngZone, _applicationRef, _posService, _document) {
        this._viewContainerRef = _viewContainerRef;
        this._renderer = _renderer;
        this._elementRef = _elementRef;
        this._injector = _injector;
        this._componentFactoryResolver = _componentFactoryResolver;
        this._ngZone = _ngZone;
        this._applicationRef = _applicationRef;
        this._posService = _posService;
        this._document = _document;
        this.onBeforeShow = new EventEmitter();
        this.onShown = new EventEmitter();
        this.onBeforeHide = new EventEmitter();
        this.onHidden = new EventEmitter();
        this._providers = [];
        this._isHiding = false;
        /**
         * A selector used if container element was not found
         */
        this.containerDefaultSelector = 'body';
        this._listenOpts = {};
        this._globalListener = Function.prototype;
    }
    get isShown() {
        if (this._isHiding) {
            return false;
        }
        return !!this._componentRef;
    }
    attach(compType) {
        this._componentFactory = this._componentFactoryResolver
            .resolveComponentFactory(compType);
        return this;
    }
    // todo: add behaviour: to target element, `body`, custom element
    to(container) {
        this.container = container || this.container;
        return this;
    }
    position(opts) {
        if (!opts) {
            return this;
        }
        this.attachment = opts.attachment || this.attachment;
        this._elementRef = opts.target || this._elementRef;
        return this;
    }
    provide(provider) {
        this._providers.push(provider);
        return this;
    }
    // todo: appendChild to element or document.querySelector(this.container)
    show(opts = {}) {
        this._subscribePositioning();
        this._innerComponent = void 0;
        if (!this._componentRef) {
            this.onBeforeShow.emit();
            this._contentRef = this._getContentRef(opts.content, opts.context, opts.initialState);
            const injector = Injector.create({
                providers: this._providers,
                parent: this._injector
            });
            if (!this._componentFactory) {
                return;
            }
            this._componentRef = this._componentFactory.create(injector, this._contentRef.nodes);
            this._applicationRef.attachView(this._componentRef.hostView);
            // this._componentRef = this._viewContainerRef
            //   .createComponent(this._componentFactory, 0, injector, this._contentRef.nodes);
            this.instance = this._componentRef.instance;
            Object.assign(this._componentRef.instance, opts);
            if (this.container instanceof ElementRef) {
                this.container.nativeElement.appendChild(this._componentRef.location.nativeElement);
            }
            if (typeof this.container === 'string' && typeof this._document !== 'undefined') {
                const selectedElement = this._document.querySelector(this.container) ||
                    this._document.querySelector(this.containerDefaultSelector);
                if (!selectedElement) {
                    return;
                }
                selectedElement.appendChild(this._componentRef.location.nativeElement);
            }
            if (!this.container &&
                this._elementRef &&
                this._elementRef.nativeElement.parentElement) {
                this._elementRef.nativeElement.parentElement.appendChild(this._componentRef.location.nativeElement);
            }
            // we need to manually invoke change detection since events registered
            // via
            // Renderer::listen() are not picked up by change detection with the
            // OnPush strategy
            if (this._contentRef.componentRef) {
                this._innerComponent = this._contentRef.componentRef.instance;
                this._contentRef.componentRef.changeDetectorRef.markForCheck();
                this._contentRef.componentRef.changeDetectorRef.detectChanges();
            }
            this._componentRef.changeDetectorRef.markForCheck();
            this._componentRef.changeDetectorRef.detectChanges();
            this.onShown.emit(opts.id ? { id: opts.id } : this._componentRef.instance);
        }
        this._registerOutsideClick();
        return this._componentRef;
    }
    hide(id) {
        if (!this._componentRef) {
            return this;
        }
        this._posService.deletePositionElement(this._componentRef.location);
        this.onBeforeHide.emit(this._componentRef.instance);
        const componentEl = this._componentRef.location.nativeElement;
        componentEl.parentNode?.removeChild(componentEl);
        this._contentRef?.componentRef?.destroy();
        if (this._viewContainerRef && this._contentRef?.viewRef) {
            this._viewContainerRef.remove(this._viewContainerRef.indexOf(this._contentRef.viewRef));
        }
        this._contentRef?.viewRef?.destroy();
        this._componentRef?.destroy();
        this._contentRef = void 0;
        this._componentRef = void 0;
        this._removeGlobalListener();
        this.onHidden.emit(id ? { id } : null);
        return this;
    }
    toggle() {
        if (this.isShown) {
            this.hide();
            return;
        }
        this.show();
    }
    dispose() {
        if (this.isShown) {
            this.hide();
        }
        this._unsubscribePositioning();
        if (this._unregisterListenersFn) {
            this._unregisterListenersFn();
        }
    }
    listen(listenOpts) {
        this.triggers = listenOpts.triggers || this.triggers;
        this._listenOpts.outsideClick = listenOpts.outsideClick;
        this._listenOpts.outsideEsc = listenOpts.outsideEsc;
        listenOpts.target = listenOpts.target || this._elementRef?.nativeElement;
        const hide = (this._listenOpts.hide = () => listenOpts.hide ? listenOpts.hide() : void this.hide());
        const show = (this._listenOpts.show = (registerHide) => {
            listenOpts.show ? listenOpts.show(registerHide) : this.show(registerHide);
            registerHide();
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toggle = (registerHide) => {
            this.isShown ? hide() : show(registerHide);
        };
        if (this._renderer) {
            this._unregisterListenersFn = listenToTriggersV2(this._renderer, {
                target: listenOpts.target,
                triggers: listenOpts.triggers,
                show,
                hide,
                toggle
            });
        }
        return this;
    }
    _removeGlobalListener() {
        if (this._globalListener) {
            this._globalListener();
            this._globalListener = Function.prototype;
        }
    }
    attachInline(vRef, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    template) {
        if (vRef && template) {
            this._inlineViewRef = vRef.createEmbeddedView(template);
        }
        return this;
    }
    _registerOutsideClick() {
        if (!this._componentRef || !this._componentRef.location) {
            return;
        }
        let unsubscribeOutsideClick = Function.prototype;
        let unsubscribeEscClick = Function.prototype;
        // why: should run after first event bubble
        if (this._listenOpts.outsideClick) {
            const target = this._componentRef.location.nativeElement;
            setTimeout(() => {
                if (this._renderer && this._elementRef) {
                    unsubscribeOutsideClick = registerOutsideClick(this._renderer, {
                        targets: [target, this._elementRef.nativeElement],
                        outsideClick: this._listenOpts.outsideClick,
                        hide: () => this._listenOpts.hide && this._listenOpts.hide()
                    });
                }
            });
        }
        if (this._listenOpts.outsideEsc && this._renderer && this._elementRef) {
            const target = this._componentRef.location.nativeElement;
            unsubscribeEscClick = registerEscClick(this._renderer, {
                targets: [target, this._elementRef.nativeElement],
                outsideEsc: this._listenOpts.outsideEsc,
                hide: () => this._listenOpts.hide && this._listenOpts.hide()
            });
        }
        this._globalListener = () => {
            unsubscribeOutsideClick();
            unsubscribeEscClick();
        };
    }
    getInnerComponent() {
        return this._innerComponent;
    }
    _subscribePositioning() {
        if (this._zoneSubscription || !this.attachment) {
            return;
        }
        this.onShown.subscribe(() => {
            this._posService.position({
                element: this._componentRef?.location,
                target: this._elementRef,
                attachment: this.attachment,
                appendToBody: this.container === 'body'
            });
        });
        this._zoneSubscription = this._ngZone.onStable.subscribe(() => {
            if (!this._componentRef) {
                return;
            }
            this._posService.calcPosition();
        });
    }
    _unsubscribePositioning() {
        if (!this._zoneSubscription) {
            return;
        }
        this._zoneSubscription.unsubscribe();
        this._zoneSubscription = void 0;
    }
    _getContentRef(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialState) {
        if (!content) {
            return new ContentRef([]);
        }
        if (content instanceof TemplateRef) {
            if (this._viewContainerRef) {
                const _viewRef = this._viewContainerRef
                    .createEmbeddedView(content, context);
                _viewRef.markForCheck();
                return new ContentRef([_viewRef.rootNodes], _viewRef);
            }
            const viewRef = content.createEmbeddedView({});
            this._applicationRef.attachView(viewRef);
            return new ContentRef([viewRef.rootNodes], viewRef);
        }
        if (typeof content === 'function') {
            const contentCmptFactory = this._componentFactoryResolver.resolveComponentFactory(content);
            const modalContentInjector = Injector.create({
                providers: this._providers,
                parent: this._injector
            });
            const componentRef = contentCmptFactory.create(modalContentInjector);
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            Object.assign(componentRef.instance, initialState);
            this._applicationRef.attachView(componentRef.hostView);
            return new ContentRef([[componentRef.location.nativeElement]], componentRef.hostView, componentRef);
        }
        const nodes = this._renderer
            ? [this._renderer.createText(`${content}`)]
            : [];
        return new ContentRef([nodes]);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LWxvYWRlci5jbGFzcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9jb21wb25lbnQtbG9hZGVyL2NvbXBvbmVudC1sb2FkZXIuY2xhc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMEJBQTBCO0FBQzFCLDZDQUE2QztBQUM3Qyw4Q0FBOEM7QUFDOUMsT0FBTyxFQUtMLFVBQVUsRUFFVixZQUFZLEVBQ1osUUFBUSxFQUlSLFdBQVcsRUFHWixNQUFNLGVBQWUsQ0FBQztBQUl2QixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsZ0JBQWdCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUdqRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFHakQsTUFBTSxPQUFPLGVBQWU7SUF1QzFCOzs7O09BSUc7SUFDSCxZQUNVLGlCQUErQyxFQUMvQyxTQUFnQyxFQUNoQyxXQUFtQyxFQUNuQyxTQUFtQixFQUNuQix5QkFBbUQsRUFDbkQsT0FBZSxFQUNmLGVBQStCLEVBQy9CLFdBQStCLEVBQy9CLFNBQW1CO1FBUm5CLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBOEI7UUFDL0MsY0FBUyxHQUFULFNBQVMsQ0FBdUI7UUFDaEMsZ0JBQVcsR0FBWCxXQUFXLENBQXdCO1FBQ25DLGNBQVMsR0FBVCxTQUFTLENBQVU7UUFDbkIsOEJBQXlCLEdBQXpCLHlCQUF5QixDQUEwQjtRQUNuRCxZQUFPLEdBQVAsT0FBTyxDQUFRO1FBQ2Ysb0JBQWUsR0FBZixlQUFlLENBQWdCO1FBQy9CLGdCQUFXLEdBQVgsV0FBVyxDQUFvQjtRQUMvQixjQUFTLEdBQVQsU0FBUyxDQUFVO1FBcEQ3QixpQkFBWSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7UUFDbEMsWUFBTyxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7UUFDN0IsaUJBQVksR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFDO1FBQ2xDLGFB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QztRQUNKLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUztZQUMxQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxHQUFHLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDM0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNQLE9BQU8sSUFBSSxVQUFVLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ2pDLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRvZG86IGFkZCBkZWxheSBzdXBwb3J0XG4vLyB0b2RvOiBtZXJnZSBldmVudHMgb25TaG93LCBvblNob3duLCBldGMuLi5cbi8vIHRvZG86IGFkZCBnbG9iYWwgcG9zaXRpb25pbmcgY29uZmlndXJhdGlvbj9cbmltcG9ydCB7XG4gIEFwcGxpY2F0aW9uUmVmLFxuICBDb21wb25lbnRGYWN0b3J5LFxuICBDb21wb25lbnRGYWN0b3J5UmVzb2x2ZXIsXG4gIENvbXBvbmVudFJlZixcbiAgRWxlbWVudFJlZixcbiAgRW1iZWRkZWRWaWV3UmVmLFxuICBFdmVudEVtaXR0ZXIsXG4gIEluamVjdG9yLFxuICBOZ1pvbmUsXG4gIFJlbmRlcmVyMixcbiAgU3RhdGljUHJvdmlkZXIsXG4gIFRlbXBsYXRlUmVmLFxuICBUeXBlLFxuICBWaWV3Q29udGFpbmVyUmVmXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQgeyBQb3NpdGlvbmluZ09wdGlvbnMsIFBvc2l0aW9uaW5nU2VydmljZSB9IGZyb20gJ25neC1ib290c3RyYXAvcG9zaXRpb25pbmcnO1xuXG5pbXBvcnQgeyBsaXN0ZW5Ub1RyaWdnZXJzVjIsIHJlZ2lzdGVyRXNjQ2xpY2ssIHJlZ2lzdGVyT3V0c2lkZUNsaWNrIH0gZnJvbSAnbmd4LWJvb3RzdHJhcC91dGlscyc7XG5pbXBvcnQgeyBTdWJzY3JpcHRpb24gfSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHsgQ29udGVudFJlZiB9IGZyb20gJy4vY29udGVudC1yZWYuY2xhc3MnO1xuaW1wb3J0IHsgTGlzdGVuT3B0aW9ucyB9IGZyb20gJy4vbGlzdGVuLW9wdGlvbnMubW9kZWwnO1xuXG5leHBvcnQgY2xhc3MgQ29tcG9uZW50TG9hZGVyPFQgZXh0ZW5kcyBvYmplY3Q+IHtcbiAgb25CZWZvcmVTaG93ID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICBvblNob3duID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICBvbkJlZm9yZUhpZGUgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gIG9uSGlkZGVuID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuXG4gIGluc3RhbmNlPzogVDtcbiAgX2NvbXBvbmVudFJlZj86IENvbXBvbmVudFJlZjxUPjtcbiAgX2lubGluZVZpZXdSZWY/OiBFbWJlZGRlZFZpZXdSZWY8VD47XG5cbiAgcHJpdmF0ZSBfcHJvdmlkZXJzOiBTdGF0aWNQcm92aWRlcltdID0gW107XG4gIHByaXZhdGUgX2NvbXBvbmVudEZhY3Rvcnk/OiBDb21wb25lbnRGYWN0b3J5PFQ+O1xuICBwcml2YXRlIF96b25lU3Vic2NyaXB0aW9uPzogU3Vic2NyaXB0aW9uO1xuICBwcml2YXRlIF9jb250ZW50UmVmPzogQ29udGVudFJlZjtcbiAgcHJpdmF0ZSBfaW5uZXJDb21wb25lbnQ/OiBDb21wb25lbnRSZWY8VD47XG5cbiAgcHJpdmF0ZSBfdW5yZWdpc3Rlckxpc3RlbmVyc0ZuPzogKCkgPT4gdm9pZDtcbiAgcHJpdmF0ZSBfaXNIaWRpbmcgPSBmYWxzZTtcbiAgLyoqXG4gICAqIFBsYWNlbWVudCBvZiBhIGNvbXBvbmVudC4gQWNjZXB0czogXCJ0b3BcIiwgXCJib3R0b21cIiwgXCJsZWZ0XCIsIFwicmlnaHRcIlxuICAgKi9cbiAgcHJpdmF0ZSBhdHRhY2htZW50Pzogc3RyaW5nO1xuICAvKipcbiAgICogQSBzZWxlY3RvciBzcGVjaWZ5aW5nIHRoZSBlbGVtZW50IHRoZSBwb3BvdmVyIHNob3VsZCBiZSBhcHBlbmRlZCB0by5cbiAgICovXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgcHJpdmF0ZSBjb250YWluZXI6IHN0cmluZyB8IEVsZW1lbnRSZWYgfCBhbnk7XG4gIC8qKlxuICAgKiBBIHNlbGVjdG9yIHVzZWQgaWYgY29udGFpbmVyIGVsZW1lbnQgd2FzIG5vdCBmb3VuZFxuICAgKi9cbiAgcHJpdmF0ZSBjb250YWluZXJEZWZhdWx0U2VsZWN0b3IgPSAnYm9keSc7XG4gIC8qKlxuICAgKiBTcGVjaWZpZXMgZXZlbnRzIHRoYXQgc2hvdWxkIHRyaWdnZXIuIFN1cHBvcnRzIGEgc3BhY2Ugc2VwYXJhdGVkIGxpc3Qgb2ZcbiAgICogZXZlbnQgbmFtZXMuXG4gICAqL1xuICBwcml2YXRlIHRyaWdnZXJzPzogc3RyaW5nO1xuICBwcml2YXRlIF9saXN0ZW5PcHRzOiBMaXN0ZW5PcHRpb25zID0ge307XG4gIHByaXZhdGUgX2dsb2JhbExpc3RlbmVyID0gRnVuY3Rpb24ucHJvdG90eXBlO1xuXG4gIC8qKlxuICAgKiBEbyBub3QgdXNlIHRoaXMgZGlyZWN0bHksIGl0IHNob3VsZCBiZSBpbnN0YW5jZWQgdmlhXG4gICAqIGBDb21wb25lbnRMb2FkRmFjdG9yeS5hdHRhY2hgXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgcHVibGljIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgX3ZpZXdDb250YWluZXJSZWY6IFZpZXdDb250YWluZXJSZWYgfCB1bmRlZmluZWQsXG4gICAgcHJpdmF0ZSBfcmVuZGVyZXI6IFJlbmRlcmVyMiB8IHVuZGVmaW5lZCxcbiAgICBwcml2YXRlIF9lbGVtZW50UmVmOiBFbGVtZW50UmVmIHwgdW5kZWZpbmVkLFxuICAgIHByaXZhdGUgX2luamVjdG9yOiBJbmplY3RvcixcbiAgICBwcml2YXRlIF9jb21wb25lbnRGYWN0b3J5UmVzb2x2ZXI6IENvbXBvbmVudEZhY3RvcnlSZXNvbHZlcixcbiAgICBwcml2YXRlIF9uZ1pvbmU6IE5nWm9uZSxcbiAgICBwcml2YXRlIF9hcHBsaWNhdGlvblJlZjogQXBwbGljYXRpb25SZWYsXG4gICAgcHJpdmF0ZSBfcG9zU2VydmljZTogUG9zaXRpb25pbmdTZXJ2aWNlLFxuICAgIHByaXZhdGUgX2RvY3VtZW50OiBEb2N1bWVudCxcbiAgKSB7XG4gIH1cblxuICBnZXQgaXNTaG93bigpOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5faXNIaWRpbmcpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gISF0aGlzLl9jb21wb25lbnRSZWY7XG4gIH1cblxuICBhdHRhY2goY29tcFR5cGU6IFR5cGU8VD4pOiBDb21wb25lbnRMb2FkZXI8VD4ge1xuICAgIHRoaXMuX2NvbXBvbmVudEZhY3RvcnkgPSB0aGlzLl9jb21wb25lbnRGYWN0b3J5UmVzb2x2ZXJcbiAgICAgIC5yZXNvbHZlQ29tcG9uZW50RmFjdG9yeTxUPihjb21wVHlwZSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIHRvZG86IGFkZCBiZWhhdmlvdXI6IHRvIHRhcmdldCBlbGVtZW50LCBgYm9keWAsIGN1c3RvbSBlbGVtZW50XG4gIHRvKGNvbnRhaW5lcj86IHN0cmluZyB8IEVsZW1lbnRSZWYpOiBDb21wb25lbnRMb2FkZXI8VD4ge1xuICAgIHRoaXMuY29udGFpbmVyID0gY29udGFpbmVyIHx8IHRoaXMuY29udGFpbmVyO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBwb3NpdGlvbihvcHRzPzogUG9zaXRpb25pbmdPcHRpb25zKTogQ29tcG9uZW50TG9hZGVyPFQ+IHtcbiAgICBpZiAoIW9wdHMpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHRoaXMuYXR0YWNobWVudCA9IG9wdHMuYXR0YWNobWVudCB8fCB0aGlzLmF0dGFjaG1lbnQ7XG4gICAgdGhpcy5fZWxlbWVudFJlZiA9IChvcHRzLnRhcmdldCBhcyBFbGVtZW50UmVmKSB8fCB0aGlzLl9lbGVtZW50UmVmO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBwcm92aWRlKHByb3ZpZGVyOiBTdGF0aWNQcm92aWRlcik6IENvbXBvbmVudExvYWRlcjxUPiB7XG4gICAgdGhpcy5fcHJvdmlkZXJzLnB1c2gocHJvdmlkZXIpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyB0b2RvOiBhcHBlbmRDaGlsZCB0byBlbGVtZW50IG9yIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IodGhpcy5jb250YWluZXIpXG5cbiAgc2hvdyhvcHRzOiB7XG4gICAgICAgICBjb250ZW50Pzogc3RyaW5nIHwgVGVtcGxhdGVSZWY8dW5rbm93bj47XG4gICAgICAgICBjb250ZXh0PzogdW5rbm93bjtcbiAgICAgICAgIGluaXRpYWxTdGF0ZT86IHVua25vd247XG4gICAgICAgICBba2V5OiBzdHJpbmddOiB1bmtub3duO1xuICAgICAgICAgaWQ/OiBudW1iZXIgfCBzdHJpbmc7XG4gICAgICAgfSA9IHt9XG4gICk6IENvbXBvbmVudFJlZjxUPiB8IHVuZGVmaW5lZCB7XG5cbiAgICB0aGlzLl9zdWJzY3JpYmVQb3NpdGlvbmluZygpO1xuICAgIHRoaXMuX2lubmVyQ29tcG9uZW50ID0gdm9pZCAwO1xuXG4gICAgaWYgKCF0aGlzLl9jb21wb25lbnRSZWYpIHtcbiAgICAgIHRoaXMub25CZWZvcmVTaG93LmVtaXQoKTtcbiAgICAgIHRoaXMuX2NvbnRlbnRSZWYgPSB0aGlzLl9nZXRDb250ZW50UmVmKG9wdHMuY29udGVudCwgb3B0cy5jb250ZXh0LCBvcHRzLmluaXRpYWxTdGF0ZSk7XG5cbiAgICAgIGNvbnN0IGluamVjdG9yID0gSW5qZWN0b3IuY3JlYXRlKHtcbiAgICAgICAgcHJvdmlkZXJzOiB0aGlzLl9wcm92aWRlcnMsXG4gICAgICAgIHBhcmVudDogdGhpcy5faW5qZWN0b3JcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoIXRoaXMuX2NvbXBvbmVudEZhY3RvcnkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9jb21wb25lbnRSZWYgPSB0aGlzLl9jb21wb25lbnRGYWN0b3J5LmNyZWF0ZShpbmplY3RvciwgdGhpcy5fY29udGVudFJlZi5ub2Rlcyk7XG5cbiAgICAgIHRoaXMuX2FwcGxpY2F0aW9uUmVmLmF0dGFjaFZpZXcodGhpcy5fY29tcG9uZW50UmVmLmhvc3RWaWV3KTtcbiAgICAgIC8vIHRoaXMuX2NvbXBvbmVudFJlZiA9IHRoaXMuX3ZpZXdDb250YWluZXJSZWZcbiAgICAgIC8vICAgLmNyZWF0ZUNvbXBvbmVudCh0aGlzLl9jb21wb25lbnRGYWN0b3J5LCAwLCBpbmplY3RvciwgdGhpcy5fY29udGVudFJlZi5ub2Rlcyk7XG4gICAgICB0aGlzLmluc3RhbmNlID0gdGhpcy5fY29tcG9uZW50UmVmLmluc3RhbmNlO1xuXG4gICAgICBPYmplY3QuYXNzaWduKHRoaXMuX2NvbXBvbmVudFJlZi5pbnN0YW5jZSwgb3B0cyk7XG5cbiAgICAgIGlmICh0aGlzLmNvbnRhaW5lciBpbnN0YW5jZW9mIEVsZW1lbnRSZWYpIHtcbiAgICAgICAgdGhpcy5jb250YWluZXIubmF0aXZlRWxlbWVudC5hcHBlbmRDaGlsZChcbiAgICAgICAgICB0aGlzLl9jb21wb25lbnRSZWYubG9jYXRpb24ubmF0aXZlRWxlbWVudFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIHRoaXMuY29udGFpbmVyID09PSAnc3RyaW5nJyAmJiB0eXBlb2YgdGhpcy5fZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGNvbnN0IHNlbGVjdGVkRWxlbWVudCA9IHRoaXMuX2RvY3VtZW50LnF1ZXJ5U2VsZWN0b3IodGhpcy5jb250YWluZXIpIHx8XG4gICAgICAgICAgdGhpcy5fZG9jdW1lbnQucXVlcnlTZWxlY3Rvcih0aGlzLmNvbnRhaW5lckRlZmF1bHRTZWxlY3Rvcik7XG5cbiAgICAgICAgaWYgKCFzZWxlY3RlZEVsZW1lbnQpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBzZWxlY3RlZEVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5fY29tcG9uZW50UmVmLmxvY2F0aW9uLm5hdGl2ZUVsZW1lbnQpO1xuICAgICAgfVxuXG4gICAgICBpZiAoXG4gICAgICAgICF0aGlzLmNvbnRhaW5lciAmJlxuICAgICAgICB0aGlzLl9lbGVtZW50UmVmICYmXG4gICAgICAgIHRoaXMuX2VsZW1lbnRSZWYubmF0aXZlRWxlbWVudC5wYXJlbnRFbGVtZW50XG4gICAgICApIHtcbiAgICAgICAgdGhpcy5fZWxlbWVudFJlZi5uYXRpdmVFbGVtZW50LnBhcmVudEVsZW1lbnQuYXBwZW5kQ2hpbGQoXG4gICAgICAgICAgdGhpcy5fY29tcG9uZW50UmVmLmxvY2F0aW9uLm5hdGl2ZUVsZW1lbnRcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgLy8gd2UgbmVlZCB0byBtYW51YWxseSBpbnZva2UgY2hhbmdlIGRldGVjdGlvbiBzaW5jZSBldmVudHMgcmVnaXN0ZXJlZFxuICAgICAgLy8gdmlhXG4gICAgICAvLyBSZW5kZXJlcjo6bGlzdGVuKCkgYXJlIG5vdCBwaWNrZWQgdXAgYnkgY2hhbmdlIGRldGVjdGlvbiB3aXRoIHRoZVxuICAgICAgLy8gT25QdXNoIHN0cmF0ZWd5XG4gICAgICBpZiAodGhpcy5fY29udGVudFJlZi5jb21wb25lbnRSZWYpIHtcbiAgICAgICAgdGhpcy5faW5uZXJDb21wb25lbnQgPSB0aGlzLl9jb250ZW50UmVmLmNvbXBvbmVudFJlZi5pbnN0YW5jZTtcbiAgICAgICAgdGhpcy5fY29udGVudFJlZi5jb21wb25lbnRSZWYuY2hhbmdlRGV0ZWN0b3JSZWYubWFya0ZvckNoZWNrKCk7XG4gICAgICAgIHRoaXMuX2NvbnRlbnRSZWYuY29tcG9uZW50UmVmLmNoYW5nZURldGVjdG9yUmVmLmRldGVjdENoYW5nZXMoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX2NvbXBvbmVudFJlZi5jaGFuZ2VEZXRlY3RvclJlZi5tYXJrRm9yQ2hlY2soKTtcbiAgICAgIHRoaXMuX2NvbXBvbmVudFJlZi5jaGFuZ2VEZXRlY3RvclJlZi5kZXRlY3RDaGFuZ2VzKCk7XG5cblxuICAgICAgdGhpcy5vblNob3duLmVtaXQob3B0cy5pZCA/IHsgaWQ6IG9wdHMuaWQgfSA6IHRoaXMuX2NvbXBvbmVudFJlZi5pbnN0YW5jZSk7XG4gICAgfVxuXG4gICAgdGhpcy5fcmVnaXN0ZXJPdXRzaWRlQ2xpY2soKTtcblxuICAgIHJldHVybiB0aGlzLl9jb21wb25lbnRSZWY7XG4gIH1cblxuICBoaWRlKGlkPzogbnVtYmVyIHwgc3RyaW5nKTogQ29tcG9uZW50TG9hZGVyPFQ+IHtcbiAgICBpZiAoIXRoaXMuX2NvbXBvbmVudFJlZikge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgdGhpcy5fcG9zU2VydmljZS5kZWxldGVQb3NpdGlvbkVsZW1lbnQodGhpcy5fY29tcG9uZW50UmVmLmxvY2F0aW9uKTtcblxuICAgIHRoaXMub25CZWZvcmVIaWRlLmVtaXQodGhpcy5fY29tcG9uZW50UmVmLmluc3RhbmNlKTtcblxuICAgIGNvbnN0IGNvbXBvbmVudEVsID0gdGhpcy5fY29tcG9uZW50UmVmLmxvY2F0aW9uLm5hdGl2ZUVsZW1lbnQ7XG4gICAgY29tcG9uZW50RWwucGFyZW50Tm9kZT8ucmVtb3ZlQ2hpbGQoY29tcG9uZW50RWwpO1xuXG4gICAgdGhpcy5fY29udGVudFJlZj8uY29tcG9uZW50UmVmPy5kZXN0cm95KCk7XG5cbiAgICBpZiAodGhpcy5fdmlld0NvbnRhaW5lclJlZiAmJiB0aGlzLl9jb250ZW50UmVmPy52aWV3UmVmKSB7XG4gICAgICB0aGlzLl92aWV3Q29udGFpbmVyUmVmLnJlbW92ZShcbiAgICAgICAgdGhpcy5fdmlld0NvbnRhaW5lclJlZi5pbmRleE9mKHRoaXMuX2NvbnRlbnRSZWYudmlld1JlZilcbiAgICAgICk7XG4gICAgfVxuICAgIHRoaXMuX2NvbnRlbnRSZWY/LnZpZXdSZWY/LmRlc3Ryb3koKTtcbiAgICB0aGlzLl9jb21wb25lbnRSZWY/LmRlc3Ryb3koKTtcblxuICAgIHRoaXMuX2NvbnRlbnRSZWYgPSB2b2lkIDA7XG4gICAgdGhpcy5fY29tcG9uZW50UmVmID0gdm9pZCAwO1xuICAgIHRoaXMuX3JlbW92ZUdsb2JhbExpc3RlbmVyKCk7XG5cbiAgICB0aGlzLm9uSGlkZGVuLmVtaXQoaWQgPyB7IGlkIH0gOiBudWxsKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdG9nZ2xlKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmlzU2hvd24pIHtcbiAgICAgIHRoaXMuaGlkZSgpO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5zaG93KCk7XG4gIH1cblxuICBkaXNwb3NlKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmlzU2hvd24pIHtcbiAgICAgIHRoaXMuaGlkZSgpO1xuICAgIH1cblxuICAgIHRoaXMuX3Vuc3Vic2NyaWJlUG9zaXRpb25pbmcoKTtcblxuICAgIGlmICh0aGlzLl91bnJlZ2lzdGVyTGlzdGVuZXJzRm4pIHtcbiAgICAgIHRoaXMuX3VucmVnaXN0ZXJMaXN0ZW5lcnNGbigpO1xuICAgIH1cbiAgfVxuXG4gIGxpc3RlbihsaXN0ZW5PcHRzOiBMaXN0ZW5PcHRpb25zKTogQ29tcG9uZW50TG9hZGVyPFQ+IHtcbiAgICB0aGlzLnRyaWdnZXJzID0gbGlzdGVuT3B0cy50cmlnZ2VycyB8fCB0aGlzLnRyaWdnZXJzO1xuICAgIHRoaXMuX2xpc3Rlbk9wdHMub3V0c2lkZUNsaWNrID0gbGlzdGVuT3B0cy5vdXRzaWRlQ2xpY2s7XG4gICAgdGhpcy5fbGlzdGVuT3B0cy5vdXRzaWRlRXNjID0gbGlzdGVuT3B0cy5vdXRzaWRlRXNjO1xuICAgIGxpc3Rlbk9wdHMudGFyZ2V0ID0gbGlzdGVuT3B0cy50YXJnZXQgfHwgdGhpcy5fZWxlbWVudFJlZj8ubmF0aXZlRWxlbWVudDtcblxuICAgIGNvbnN0IGhpZGUgPSAodGhpcy5fbGlzdGVuT3B0cy5oaWRlID0gKCkgPT5cbiAgICAgIGxpc3Rlbk9wdHMuaGlkZSA/IGxpc3Rlbk9wdHMuaGlkZSgpIDogdm9pZCB0aGlzLmhpZGUoKSk7XG4gICAgY29uc3Qgc2hvdyA9ICh0aGlzLl9saXN0ZW5PcHRzLnNob3cgPSAocmVnaXN0ZXJIaWRlKSA9PiB7XG4gICAgICBsaXN0ZW5PcHRzLnNob3cgPyBsaXN0ZW5PcHRzLnNob3cocmVnaXN0ZXJIaWRlKSA6IHRoaXMuc2hvdyhyZWdpc3RlckhpZGUpO1xuICAgICAgcmVnaXN0ZXJIaWRlKCk7XG4gICAgfSk7XG5cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIGNvbnN0IHRvZ2dsZSA9IChyZWdpc3RlckhpZGU6IGFueSkgPT4ge1xuICAgICAgdGhpcy5pc1Nob3duID8gaGlkZSgpIDogc2hvdyhyZWdpc3RlckhpZGUpO1xuICAgIH07XG5cbiAgICBpZiAodGhpcy5fcmVuZGVyZXIpIHtcbiAgICAgIHRoaXMuX3VucmVnaXN0ZXJMaXN0ZW5lcnNGbiA9IGxpc3RlblRvVHJpZ2dlcnNWMih0aGlzLl9yZW5kZXJlciwge1xuICAgICAgICB0YXJnZXQ6IGxpc3Rlbk9wdHMudGFyZ2V0LFxuICAgICAgICB0cmlnZ2VyczogbGlzdGVuT3B0cy50cmlnZ2VycyxcbiAgICAgICAgc2hvdyxcbiAgICAgICAgaGlkZSxcbiAgICAgICAgdG9nZ2xlXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIF9yZW1vdmVHbG9iYWxMaXN0ZW5lcigpIHtcbiAgICBpZiAodGhpcy5fZ2xvYmFsTGlzdGVuZXIpIHtcbiAgICAgIHRoaXMuX2dsb2JhbExpc3RlbmVyKCk7XG4gICAgICB0aGlzLl9nbG9iYWxMaXN0ZW5lciA9IEZ1bmN0aW9uLnByb3RvdHlwZTtcbiAgICB9XG4gIH1cblxuICBhdHRhY2hJbmxpbmUoXG4gICAgdlJlZjogVmlld0NvbnRhaW5lclJlZiB8IHVuZGVmaW5lZCxcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIHRlbXBsYXRlOiBUZW1wbGF0ZVJlZjxhbnk+IHwgdW5kZWZpbmVkXG4gICk6IENvbXBvbmVudExvYWRlcjxUPiB7XG4gICAgaWYgKHZSZWYgJiYgdGVtcGxhdGUpIHtcbiAgICAgIHRoaXMuX2lubGluZVZpZXdSZWYgPSB2UmVmLmNyZWF0ZUVtYmVkZGVkVmlldyh0ZW1wbGF0ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBfcmVnaXN0ZXJPdXRzaWRlQ2xpY2soKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLl9jb21wb25lbnRSZWYgfHwgIXRoaXMuX2NvbXBvbmVudFJlZi5sb2NhdGlvbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCB1bnN1YnNjcmliZU91dHNpZGVDbGljayA9IEZ1bmN0aW9uLnByb3RvdHlwZTtcbiAgICBsZXQgdW5zdWJzY3JpYmVFc2NDbGljayA9IEZ1bmN0aW9uLnByb3RvdHlwZTtcblxuICAgIC8vIHdoeTogc2hvdWxkIHJ1biBhZnRlciBmaXJzdCBldmVudCBidWJibGVcbiAgICBpZiAodGhpcy5fbGlzdGVuT3B0cy5vdXRzaWRlQ2xpY2spIHtcbiAgICAgIGNvbnN0IHRhcmdldCA9IHRoaXMuX2NvbXBvbmVudFJlZi5sb2NhdGlvbi5uYXRpdmVFbGVtZW50O1xuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGlmICh0aGlzLl9yZW5kZXJlciAmJiB0aGlzLl9lbGVtZW50UmVmKSB7XG4gICAgICAgICAgdW5zdWJzY3JpYmVPdXRzaWRlQ2xpY2sgPSByZWdpc3Rlck91dHNpZGVDbGljayh0aGlzLl9yZW5kZXJlciwge1xuICAgICAgICAgICAgdGFyZ2V0czogW3RhcmdldCwgdGhpcy5fZWxlbWVudFJlZi5uYXRpdmVFbGVtZW50XSxcbiAgICAgICAgICAgIG91dHNpZGVDbGljazogdGhpcy5fbGlzdGVuT3B0cy5vdXRzaWRlQ2xpY2ssXG4gICAgICAgICAgICBoaWRlOiAoKSA9PiB0aGlzLl9saXN0ZW5PcHRzLmhpZGUgJiYgdGhpcy5fbGlzdGVuT3B0cy5oaWRlKClcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIGlmICh0aGlzLl9saXN0ZW5PcHRzLm91dHNpZGVFc2MgJiYgdGhpcy5fcmVuZGVyZXIgJiYgdGhpcy5fZWxlbWVudFJlZikge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5fY29tcG9uZW50UmVmLmxvY2F0aW9uLm5hdGl2ZUVsZW1lbnQ7XG4gICAgICB1bnN1YnNjcmliZUVzY0NsaWNrID0gcmVnaXN0ZXJFc2NDbGljayh0aGlzLl9yZW5kZXJlciwge1xuICAgICAgICB0YXJnZXRzOiBbdGFyZ2V0LCB0aGlzLl9lbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnRdLFxuICAgICAgICBvdXRzaWRlRXNjOiB0aGlzLl9saXN0ZW5PcHRzLm91dHNpZGVFc2MsXG4gICAgICAgIGhpZGU6ICgpID0+IHRoaXMuX2xpc3Rlbk9wdHMuaGlkZSAmJiB0aGlzLl9saXN0ZW5PcHRzLmhpZGUoKVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy5fZ2xvYmFsTGlzdGVuZXIgPSAoKSA9PiB7XG4gICAgICB1bnN1YnNjcmliZU91dHNpZGVDbGljaygpO1xuICAgICAgdW5zdWJzY3JpYmVFc2NDbGljaygpO1xuICAgIH07XG4gIH1cblxuICBnZXRJbm5lckNvbXBvbmVudCgpOiBDb21wb25lbnRSZWY8VD4gfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLl9pbm5lckNvbXBvbmVudDtcbiAgfVxuXG4gIHByaXZhdGUgX3N1YnNjcmliZVBvc2l0aW9uaW5nKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLl96b25lU3Vic2NyaXB0aW9uIHx8ICF0aGlzLmF0dGFjaG1lbnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLm9uU2hvd24uc3Vic2NyaWJlKCgpID0+IHtcbiAgICAgIHRoaXMuX3Bvc1NlcnZpY2UucG9zaXRpb24oe1xuICAgICAgICBlbGVtZW50OiB0aGlzLl9jb21wb25lbnRSZWY/LmxvY2F0aW9uLFxuICAgICAgICB0YXJnZXQ6IHRoaXMuX2VsZW1lbnRSZWYsXG4gICAgICAgIGF0dGFjaG1lbnQ6IHRoaXMuYXR0YWNobWVudCxcbiAgICAgICAgYXBwZW5kVG9Cb2R5OiB0aGlzLmNvbnRhaW5lciA9PT0gJ2JvZHknXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRoaXMuX3pvbmVTdWJzY3JpcHRpb24gPSB0aGlzLl9uZ1pvbmUub25TdGFibGUuc3Vic2NyaWJlKCgpID0+IHtcbiAgICAgIGlmICghdGhpcy5fY29tcG9uZW50UmVmKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fcG9zU2VydmljZS5jYWxjUG9zaXRpb24oKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgX3Vuc3Vic2NyaWJlUG9zaXRpb25pbmcoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLl96b25lU3Vic2NyaXB0aW9uKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5fem9uZVN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgIHRoaXMuX3pvbmVTdWJzY3JpcHRpb24gPSB2b2lkIDA7XG4gIH1cblxuICBwcml2YXRlIF9nZXRDb250ZW50UmVmKFxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XG4gICAgY29udGVudDogc3RyaW5nIHwgVGVtcGxhdGVSZWY8YW55PiB8IGFueSxcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgIGNvbnRleHQ/OiBhbnksXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICBpbml0aWFsU3RhdGU/OiBhbnlcbiAgKTogQ29udGVudFJlZiB7XG4gICAgaWYgKCFjb250ZW50KSB7XG4gICAgICByZXR1cm4gbmV3IENvbnRlbnRSZWYoW10pO1xuICAgIH1cblxuICAgIGlmIChjb250ZW50IGluc3RhbmNlb2YgVGVtcGxhdGVSZWYpIHtcbiAgICAgIGlmICh0aGlzLl92aWV3Q29udGFpbmVyUmVmKSB7XG4gICAgICAgIGNvbnN0IF92aWV3UmVmID0gdGhpcy5fdmlld0NvbnRhaW5lclJlZlxuICAgICAgICAgIC5jcmVhdGVFbWJlZGRlZFZpZXc8VGVtcGxhdGVSZWY8VD4+KGNvbnRlbnQsIGNvbnRleHQpO1xuICAgICAgICBfdmlld1JlZi5tYXJrRm9yQ2hlY2soKTtcblxuICAgICAgICByZXR1cm4gbmV3IENvbnRlbnRSZWYoW192aWV3UmVmLnJvb3ROb2Rlc10sIF92aWV3UmVmKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHZpZXdSZWYgPSBjb250ZW50LmNyZWF0ZUVtYmVkZGVkVmlldyh7fSk7XG4gICAgICB0aGlzLl9hcHBsaWNhdGlvblJlZi5hdHRhY2hWaWV3KHZpZXdSZWYpO1xuXG4gICAgICByZXR1cm4gbmV3IENvbnRlbnRSZWYoW3ZpZXdSZWYucm9vdE5vZGVzXSwgdmlld1JlZik7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBjb250ZW50ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjb25zdCBjb250ZW50Q21wdEZhY3RvcnkgPSB0aGlzLl9jb21wb25lbnRGYWN0b3J5UmVzb2x2ZXIucmVzb2x2ZUNvbXBvbmVudEZhY3RvcnkoXG4gICAgICAgIGNvbnRlbnRcbiAgICAgICk7XG5cbiAgICAgIGNvbnN0IG1vZGFsQ29udGVudEluamVjdG9yID0gSW5qZWN0b3IuY3JlYXRlKHtcbiAgICAgICAgcHJvdmlkZXJzOiB0aGlzLl9wcm92aWRlcnMsXG4gICAgICAgIHBhcmVudDogdGhpcy5faW5qZWN0b3JcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBjb21wb25lbnRSZWYgPSBjb250ZW50Q21wdEZhY3RvcnkuY3JlYXRlKG1vZGFsQ29udGVudEluamVjdG9yKTtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvYmFuLXRzLWNvbW1lbnRcbiAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgIE9iamVjdC5hc3NpZ24oY29tcG9uZW50UmVmLmluc3RhbmNlLCBpbml0aWFsU3RhdGUpO1xuICAgICAgdGhpcy5fYXBwbGljYXRpb25SZWYuYXR0YWNoVmlldyhjb21wb25lbnRSZWYuaG9zdFZpZXcpO1xuXG4gICAgICByZXR1cm4gbmV3IENvbnRlbnRSZWYoXG4gICAgICAgIFtbY29tcG9uZW50UmVmLmxvY2F0aW9uLm5hdGl2ZUVsZW1lbnRdXSxcbiAgICAgICAgY29tcG9uZW50UmVmLmhvc3RWaWV3LFxuICAgICAgICBjb21wb25lbnRSZWZcbiAgICAgICk7XG4gICAgfVxuXG4gICAgY29uc3Qgbm9kZXMgPSB0aGlzLl9yZW5kZXJlclxuICAgICAgPyBbdGhpcy5fcmVuZGVyZXIuY3JlYXRlVGV4dChgJHtjb250ZW50fWApXVxuICAgICAgOiBbXTtcbiAgICByZXR1cm4gbmV3IENvbnRlbnRSZWYoW25vZGVzXSk7XG4gIH1cbn1cbiJdfQ==