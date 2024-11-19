import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Renderer2 } from '@angular/core';
import { BsDropdownState } from './bs-dropdown.state';
import { dropdownAnimation } from './dropdown-animations';
import { AnimationBuilder } from '@angular/animations';
import { NgClass } from '@angular/common';
import * as i0 from "@angular/core";
import * as i1 from "./bs-dropdown.state";
import * as i2 from "@angular/animations";
// todo: revert ngClass to [class] when false positive angular-cli issue is fixed
//          [class.dropdown]="direction === 'down'"-->
export class BsDropdownContainerComponent {
    get direction() {
        return this._state.direction;
    }
    constructor(_state, cd, _renderer, _element, _builder) {
        this._state = _state;
        this.cd = cd;
        this._renderer = _renderer;
        this._element = _element;
        this.isOpen = false;
        this._factoryDropDownAnimation = _builder.build(dropdownAnimation);
        this._subscription = _state.isOpenChange.subscribe((value) => {
            this.isOpen = value;
            const dropdown = this._element.nativeElement.querySelector('.dropdown-menu');
            this._renderer.addClass(this._element.nativeElement.querySelector('div'), 'open');
            if (dropdown) {
                this._renderer.addClass(dropdown, 'show');
                if (dropdown.classList.contains('dropdown-menu-right') || dropdown.classList.contains('dropdown-menu-end')) {
                    this._renderer.setStyle(dropdown, 'left', 'auto');
                    this._renderer.setStyle(dropdown, 'right', '0');
                }
                if (this.direction === 'up') {
                    this._renderer.setStyle(dropdown, 'top', 'auto');
                    this._renderer.setStyle(dropdown, 'transform', 'translateY(-101%)');
                }
            }
            if (dropdown && this._state.isAnimated) {
                this._factoryDropDownAnimation.create(dropdown)
                    .play();
            }
            this.cd.markForCheck();
            this.cd.detectChanges();
        });
    }
    /** @internal */
    _contains(el) {
        return this._element.nativeElement.contains(el);
    }
    ngOnDestroy() {
        this._subscription.unsubscribe();
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: BsDropdownContainerComponent, deps: [{ token: i1.BsDropdownState }, { token: i0.ChangeDetectorRef }, { token: i0.Renderer2 }, { token: i0.ElementRef }, { token: i2.AnimationBuilder }], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "18.0.1", type: BsDropdownContainerComponent, isStandalone: true, selector: "bs-dropdown-container", host: { styleAttribute: "display:block;position: absolute;z-index: 1040" }, ngImport: i0, template: `
    <div [class.dropup]="direction === 'up'"
         [ngClass]="{dropdown: direction === 'down'}"
         [class.show]="isOpen"
         [class.open]="isOpen"><ng-content></ng-content>
    </div>
  `, isInline: true, dependencies: [{ kind: "directive", type: NgClass, selector: "[ngClass]", inputs: ["class", "ngClass"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: BsDropdownContainerComponent, decorators: [{
            type: Component,
            args: [{
                    selector: 'bs-dropdown-container',
                    changeDetection: ChangeDetectionStrategy.OnPush,
                    standalone: true,
                    imports: [NgClass],
                    // eslint-disable-next-line @angular-eslint/no-host-metadata-property
                    host: {
                        style: 'display:block;position: absolute;z-index: 1040'
                    },
                    template: `
    <div [class.dropup]="direction === 'up'"
         [ngClass]="{dropdown: direction === 'down'}"
         [class.show]="isOpen"
         [class.open]="isOpen"><ng-content></ng-content>
    </div>
  `,
                }]
        }], ctorParameters: () => [{ type: i1.BsDropdownState }, { type: i0.ChangeDetectorRef }, { type: i0.Renderer2 }, { type: i0.ElementRef }, { type: i2.AnimationBuilder }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnMtZHJvcGRvd24tY29udGFpbmVyLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9kcm9wZG93bi9icy1kcm9wZG93bi1jb250YWluZXIuY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFDTCx1QkFBdUIsRUFDdkIsaUJBQWlCLEVBQ2pCLFNBQVMsRUFDVCxVQUFVLEVBRVYsU0FBUyxFQUNWLE1BQU0sZUFBZSxDQUFDO0FBRXZCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUV0RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQW9CLE1BQU0scUJBQXFCLENBQUM7QUFFekUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlCQUFpQixDQUFDOzs7O0FBRTFDLGlGQUFpRjtBQUNqRixzREFBc0Q7QUFrQnRELE1BQU0sT0FBTyw0QkFBNEI7SUFLdkMsSUFBSSxTQUFTO1FBQ1gsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQztJQUMvQixDQUFDO0lBSUQsWUFDVSxNQUF1QixFQUN2QixFQUFxQixFQUNyQixTQUFvQixFQUNwQixRQUFvQixFQUM1QixRQUEwQjtRQUpsQixXQUFNLEdBQU4sTUFBTSxDQUFpQjtRQUN2QixPQUFFLEdBQUYsRUFBRSxDQUFtQjtRQUNyQixjQUFTLEdBQVQsU0FBUyxDQUFXO1FBQ3BCLGFBQVEsR0FBUixRQUFRLENBQVk7UUFkOUIsV0FBTSxHQUFHLEtBQUssQ0FBQztRQWlCYixJQUFJLENBQUMseUJBQXlCLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBRW5FLElBQUksQ0FBQyxhQUFhLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFjLEVBQUUsRUFBRTtZQUNwRSxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztZQUNwQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUU3RSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFFbEYsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDYixJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBRTFDLElBQUksUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsSUFBSSxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUM7b0JBQzNHLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7b0JBQ2xELElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ2xELENBQUM7Z0JBQ0QsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLElBQUksRUFBRSxDQUFDO29CQUM1QixJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO29CQUNqRCxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FDckIsUUFBUSxFQUNSLFdBQVcsRUFDWCxtQkFBbUIsQ0FDcEIsQ0FBQztnQkFDSixDQUFDO1lBQ0gsQ0FBQztZQUVELElBQUksUUFBUSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ3ZDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO3FCQUM1QyxJQUFJLEVBQUUsQ0FBQztZQUNaLENBQUM7WUFFRCxJQUFJLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxFQUFFLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDMUIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsZ0JBQWdCO0lBQ2hCLFNBQVMsQ0FBQyxFQUFXO1FBQ25CLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFRCxXQUFXO1FBQ1QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUNuQyxDQUFDOzhHQTVEVSw0QkFBNEI7a0dBQTVCLDRCQUE0Qiw2SkFSN0I7Ozs7OztHQU1ULDREQVhTLE9BQU87OzJGQWFOLDRCQUE0QjtrQkFqQnhDLFNBQVM7bUJBQUM7b0JBQ1QsUUFBUSxFQUFFLHVCQUF1QjtvQkFDakMsZUFBZSxFQUFFLHVCQUF1QixDQUFDLE1BQU07b0JBQy9DLFVBQVUsRUFBRSxJQUFJO29CQUNoQixPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUM7b0JBQ2xCLHFFQUFxRTtvQkFDckUsSUFBSSxFQUFFO3dCQUNKLEtBQUssRUFBRSxnREFBZ0Q7cUJBQ3hEO29CQUNELFFBQVEsRUFBRTs7Ozs7O0dBTVQ7aUJBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSxcbiAgQ2hhbmdlRGV0ZWN0b3JSZWYsXG4gIENvbXBvbmVudCxcbiAgRWxlbWVudFJlZixcbiAgT25EZXN0cm95LFxuICBSZW5kZXJlcjJcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmltcG9ydCB7IEJzRHJvcGRvd25TdGF0ZSB9IGZyb20gJy4vYnMtZHJvcGRvd24uc3RhdGUnO1xuXG5pbXBvcnQgeyBkcm9wZG93bkFuaW1hdGlvbiB9IGZyb20gJy4vZHJvcGRvd24tYW5pbWF0aW9ucyc7XG5pbXBvcnQgeyBBbmltYXRpb25CdWlsZGVyLCBBbmltYXRpb25GYWN0b3J5IH0gZnJvbSAnQGFuZ3VsYXIvYW5pbWF0aW9ucyc7XG5pbXBvcnQgeyBTdWJzY3JpcHRpb24gfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IE5nQ2xhc3MgfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuXG4vLyB0b2RvOiByZXZlcnQgbmdDbGFzcyB0byBbY2xhc3NdIHdoZW4gZmFsc2UgcG9zaXRpdmUgYW5ndWxhci1jbGkgaXNzdWUgaXMgZml4ZWRcbi8vICAgICAgICAgIFtjbGFzcy5kcm9wZG93bl09XCJkaXJlY3Rpb24gPT09ICdkb3duJ1wiLS0+XG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdicy1kcm9wZG93bi1jb250YWluZXInLFxuICBjaGFuZ2VEZXRlY3Rpb246IENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaCxcbiAgc3RhbmRhbG9uZTogdHJ1ZSxcbiAgaW1wb3J0czogW05nQ2xhc3NdLFxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQGFuZ3VsYXItZXNsaW50L25vLWhvc3QtbWV0YWRhdGEtcHJvcGVydHlcbiAgaG9zdDoge1xuICAgIHN0eWxlOiAnZGlzcGxheTpibG9jaztwb3NpdGlvbjogYWJzb2x1dGU7ei1pbmRleDogMTA0MCdcbiAgfSxcbiAgdGVtcGxhdGU6IGBcbiAgICA8ZGl2IFtjbGFzcy5kcm9wdXBdPVwiZGlyZWN0aW9uID09PSAndXAnXCJcbiAgICAgICAgIFtuZ0NsYXNzXT1cIntkcm9wZG93bjogZGlyZWN0aW9uID09PSAnZG93bid9XCJcbiAgICAgICAgIFtjbGFzcy5zaG93XT1cImlzT3BlblwiXG4gICAgICAgICBbY2xhc3Mub3Blbl09XCJpc09wZW5cIj48bmctY29udGVudD48L25nLWNvbnRlbnQ+XG4gICAgPC9kaXY+XG4gIGAsXG59KVxuZXhwb3J0IGNsYXNzIEJzRHJvcGRvd25Db250YWluZXJDb21wb25lbnQgaW1wbGVtZW50cyBPbkRlc3Ryb3kge1xuICBpc09wZW4gPSBmYWxzZTtcblxuICBwcml2YXRlIF9mYWN0b3J5RHJvcERvd25BbmltYXRpb246IEFuaW1hdGlvbkZhY3Rvcnk7XG5cbiAgZ2V0IGRpcmVjdGlvbigpOiAnZG93bicgfCAndXAnIHtcbiAgICByZXR1cm4gdGhpcy5fc3RhdGUuZGlyZWN0aW9uO1xuICB9XG5cbiAgcHJpdmF0ZSBfc3Vic2NyaXB0aW9uOiBTdWJzY3JpcHRpb247XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSBfc3RhdGU6IEJzRHJvcGRvd25TdGF0ZSxcbiAgICBwcml2YXRlIGNkOiBDaGFuZ2VEZXRlY3RvclJlZixcbiAgICBwcml2YXRlIF9yZW5kZXJlcjogUmVuZGVyZXIyLFxuICAgIHByaXZhdGUgX2VsZW1lbnQ6IEVsZW1lbnRSZWYsXG4gICAgX2J1aWxkZXI6IEFuaW1hdGlvbkJ1aWxkZXJcbiAgKSB7XG4gICAgdGhpcy5fZmFjdG9yeURyb3BEb3duQW5pbWF0aW9uID0gX2J1aWxkZXIuYnVpbGQoZHJvcGRvd25BbmltYXRpb24pO1xuXG4gICAgdGhpcy5fc3Vic2NyaXB0aW9uID0gX3N0YXRlLmlzT3BlbkNoYW5nZS5zdWJzY3JpYmUoKHZhbHVlOiBib29sZWFuKSA9PiB7XG4gICAgICB0aGlzLmlzT3BlbiA9IHZhbHVlO1xuICAgICAgY29uc3QgZHJvcGRvd24gPSB0aGlzLl9lbGVtZW50Lm5hdGl2ZUVsZW1lbnQucXVlcnlTZWxlY3RvcignLmRyb3Bkb3duLW1lbnUnKTtcblxuICAgICAgdGhpcy5fcmVuZGVyZXIuYWRkQ2xhc3ModGhpcy5fZWxlbWVudC5uYXRpdmVFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ2RpdicpLCAnb3BlbicpO1xuXG4gICAgICBpZiAoZHJvcGRvd24pIHtcbiAgICAgICAgdGhpcy5fcmVuZGVyZXIuYWRkQ2xhc3MoZHJvcGRvd24sICdzaG93Jyk7XG5cbiAgICAgICAgaWYgKGRyb3Bkb3duLmNsYXNzTGlzdC5jb250YWlucygnZHJvcGRvd24tbWVudS1yaWdodCcpIHx8IGRyb3Bkb3duLmNsYXNzTGlzdC5jb250YWlucygnZHJvcGRvd24tbWVudS1lbmQnKSkge1xuICAgICAgICAgIHRoaXMuX3JlbmRlcmVyLnNldFN0eWxlKGRyb3Bkb3duLCAnbGVmdCcsICdhdXRvJyk7XG4gICAgICAgICAgdGhpcy5fcmVuZGVyZXIuc2V0U3R5bGUoZHJvcGRvd24sICdyaWdodCcsICcwJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZGlyZWN0aW9uID09PSAndXAnKSB7XG4gICAgICAgICAgdGhpcy5fcmVuZGVyZXIuc2V0U3R5bGUoZHJvcGRvd24sICd0b3AnLCAnYXV0bycpO1xuICAgICAgICAgIHRoaXMuX3JlbmRlcmVyLnNldFN0eWxlKFxuICAgICAgICAgICAgZHJvcGRvd24sXG4gICAgICAgICAgICAndHJhbnNmb3JtJyxcbiAgICAgICAgICAgICd0cmFuc2xhdGVZKC0xMDElKSdcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChkcm9wZG93biAmJiB0aGlzLl9zdGF0ZS5pc0FuaW1hdGVkKSB7XG4gICAgICAgIHRoaXMuX2ZhY3RvcnlEcm9wRG93bkFuaW1hdGlvbi5jcmVhdGUoZHJvcGRvd24pXG4gICAgICAgICAgLnBsYXkoKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5jZC5tYXJrRm9yQ2hlY2soKTtcbiAgICAgIHRoaXMuY2QuZGV0ZWN0Q2hhbmdlcygpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfY29udGFpbnMoZWw6IEVsZW1lbnQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fZWxlbWVudC5uYXRpdmVFbGVtZW50LmNvbnRhaW5zKGVsKTtcbiAgfVxuXG4gIG5nT25EZXN0cm95KCk6IHZvaWQge1xuICAgIHRoaXMuX3N1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICB9XG59XG4iXX0=