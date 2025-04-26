import { ChangeDetectionStrategy, Input, Component } from '@angular/core';
import { PopoverConfig } from './popover.config';
import { getBsVer } from 'ngx-bootstrap/utils';
import { PlacementForBs5, checkMargins } from 'ngx-bootstrap/positioning';
import { NgIf } from '@angular/common';
import * as i0 from "@angular/core";
import * as i1 from "./popover.config";
export class PopoverContainerComponent {
    set placement(value) {
        if (!this._bsVersions.isBs5) {
            this._placement = value;
        }
        else {
            this._placement = PlacementForBs5[value];
        }
    }
    get _bsVersions() {
        return getBsVer();
    }
    constructor(config) {
        this._placement = 'top';
        Object.assign(this, config);
    }
    checkMarginNecessity() {
        return checkMargins(this._placement);
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: PopoverContainerComponent, deps: [{ token: i1.PopoverConfig }], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "18.0.1", type: PopoverContainerComponent, isStandalone: true, selector: "popover-container", inputs: { placement: "placement", title: "title" }, host: { attributes: { "role": "tooltip" }, properties: { "attr.id": "popoverId", "class": "\"popover in popover-\" + _placement + \" \" + \"bs-popover-\" + _placement + \" \" + _placement + \" \" + containerClass + \" \" + checkMarginNecessity()", "class.show": "!_bsVersions.isBs3", "class.bs3": "_bsVersions.isBs3" }, styleAttribute: "display:block; position:absolute" }, ngImport: i0, template: "<div class=\"popover-arrow arrow\"></div>\n<h3 class=\"popover-title popover-header\" *ngIf=\"title\">{{ title }}</h3>\n<div class=\"popover-content popover-body\">\n  <ng-content></ng-content>\n</div>\n", styles: [":host.popover.bottom>.arrow{margin-left:-4px}:host .popover-arrow{position:absolute}\n"], dependencies: [{ kind: "directive", type: NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: PopoverContainerComponent, decorators: [{
            type: Component,
            args: [{ selector: 'popover-container', changeDetection: ChangeDetectionStrategy.OnPush, host: {
                        '[attr.id]': 'popoverId',
                        '[class]': '"popover in popover-" + _placement + " " + "bs-popover-" + _placement + " " + _placement + " " + containerClass + " " + checkMarginNecessity()',
                        '[class.show]': '!_bsVersions.isBs3',
                        '[class.bs3]': '_bsVersions.isBs3',
                        role: 'tooltip',
                        style: 'display:block; position:absolute'
                    }, standalone: true, imports: [NgIf], template: "<div class=\"popover-arrow arrow\"></div>\n<h3 class=\"popover-title popover-header\" *ngIf=\"title\">{{ title }}</h3>\n<div class=\"popover-content popover-body\">\n  <ng-content></ng-content>\n</div>\n", styles: [":host.popover.bottom>.arrow{margin-left:-4px}:host .popover-arrow{position:absolute}\n"] }]
        }], ctorParameters: () => [{ type: i1.PopoverConfig }], propDecorators: { placement: [{
                type: Input
            }], title: [{
                type: Input
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wb3Zlci1jb250YWluZXIuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3BvcG92ZXIvcG9wb3Zlci1jb250YWluZXIuY29tcG9uZW50LnRzIiwiLi4vLi4vLi4vLi4vc3JjL3BvcG92ZXIvcG9wb3Zlci1jb250YWluZXIuY29tcG9uZW50Lmh0bWwiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLHVCQUF1QixFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDMUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ2pELE9BQU8sRUFBRSxRQUFRLEVBQWMsTUFBTSxxQkFBcUIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBd0IsTUFBTSwyQkFBMkIsQ0FBQztBQUNoRyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUJBQWlCLENBQUM7OztBQTZCdkMsTUFBTSxPQUFPLHlCQUF5QjtJQUNwQyxJQUFhLFNBQVMsQ0FBQyxLQUEyQjtRQUNoRCxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQztRQUMxQixDQUFDO2FBQU0sQ0FBQztZQUNOLElBQUksQ0FBQyxVQUFVLEdBQUcsZUFBZSxDQUFDLEtBQXFDLENBQUMsQ0FBQztRQUMzRSxDQUFDO0lBQ0gsQ0FBQztJQVFELElBQUksV0FBVztRQUNiLE9BQU8sUUFBUSxFQUFFLENBQUM7SUFDcEIsQ0FBQztJQUVELFlBQVksTUFBcUI7UUFOakMsZUFBVSxHQUF5QixLQUFLLENBQUM7UUFPdkMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDOUIsQ0FBQztJQUVELG9CQUFvQjtRQUNsQixPQUFPLFlBQVksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDdkMsQ0FBQzs4R0F6QlUseUJBQXlCO2tHQUF6Qix5QkFBeUIsdWZDakN0Qyw2TUFLQSxnSkQwQmMsSUFBSTs7MkZBRUwseUJBQXlCO2tCQTNCckMsU0FBUzsrQkFDSSxtQkFBbUIsbUJBQ1osdUJBQXVCLENBQUMsTUFBTSxRQUV6Qzt3QkFDRixXQUFXLEVBQUUsV0FBVzt3QkFDeEIsU0FBUyxFQUFFLGdKQUFnSjt3QkFDM0osY0FBYyxFQUFFLG9CQUFvQjt3QkFDcEMsYUFBYSxFQUFFLG1CQUFtQjt3QkFDbEMsSUFBSSxFQUFFLFNBQVM7d0JBQ2YsS0FBSyxFQUFFLGtDQUFrQztxQkFDNUMsY0FhVyxJQUFJLFdBQ1AsQ0FBQyxJQUFJLENBQUM7a0ZBR0osU0FBUztzQkFBckIsS0FBSztnQkFRRyxLQUFLO3NCQUFiLEtBQUsiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSwgSW5wdXQsIENvbXBvbmVudCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgUG9wb3ZlckNvbmZpZyB9IGZyb20gJy4vcG9wb3Zlci5jb25maWcnO1xuaW1wb3J0IHsgZ2V0QnNWZXIsIElCc1ZlcnNpb24gfSBmcm9tICduZ3gtYm9vdHN0cmFwL3V0aWxzJztcbmltcG9ydCB7IFBsYWNlbWVudEZvckJzNSwgY2hlY2tNYXJnaW5zLCBBdmFpbGFibGVCU1Bvc2l0aW9ucyB9IGZyb20gJ25neC1ib290c3RyYXAvcG9zaXRpb25pbmcnO1xuaW1wb3J0IHsgTmdJZiB9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5cbkBDb21wb25lbnQoe1xuICAgIHNlbGVjdG9yOiAncG9wb3Zlci1jb250YWluZXInLFxuICAgIGNoYW5nZURldGVjdGlvbjogQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoLFxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAYW5ndWxhci1lc2xpbnQvbm8taG9zdC1tZXRhZGF0YS1wcm9wZXJ0eVxuICAgIGhvc3Q6IHtcbiAgICAgICAgJ1thdHRyLmlkXSc6ICdwb3BvdmVySWQnLFxuICAgICAgICAnW2NsYXNzXSc6ICdcInBvcG92ZXIgaW4gcG9wb3Zlci1cIiArIF9wbGFjZW1lbnQgKyBcIiBcIiArIFwiYnMtcG9wb3Zlci1cIiArIF9wbGFjZW1lbnQgKyBcIiBcIiArIF9wbGFjZW1lbnQgKyBcIiBcIiArIGNvbnRhaW5lckNsYXNzICsgXCIgXCIgKyBjaGVja01hcmdpbk5lY2Vzc2l0eSgpJyxcbiAgICAgICAgJ1tjbGFzcy5zaG93XSc6ICchX2JzVmVyc2lvbnMuaXNCczMnLFxuICAgICAgICAnW2NsYXNzLmJzM10nOiAnX2JzVmVyc2lvbnMuaXNCczMnLFxuICAgICAgICByb2xlOiAndG9vbHRpcCcsXG4gICAgICAgIHN0eWxlOiAnZGlzcGxheTpibG9jazsgcG9zaXRpb246YWJzb2x1dGUnXG4gICAgfSxcbiAgICBzdHlsZXM6IFtcbiAgICAgICAgYFxuICAgICAgOmhvc3QucG9wb3Zlci5ib3R0b20gPiAuYXJyb3cge1xuICAgICAgICBtYXJnaW4tbGVmdDogLTRweDtcbiAgICAgIH1cblxuICAgICAgOmhvc3QgLnBvcG92ZXItYXJyb3cge1xuICAgICAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgICB9XG4gICAgYFxuICAgIF0sXG4gICAgdGVtcGxhdGVVcmw6ICcuL3BvcG92ZXItY29udGFpbmVyLmNvbXBvbmVudC5odG1sJyxcbiAgICBzdGFuZGFsb25lOiB0cnVlLFxuICAgIGltcG9ydHM6IFtOZ0lmXVxufSlcbmV4cG9ydCBjbGFzcyBQb3BvdmVyQ29udGFpbmVyQ29tcG9uZW50IHtcbiAgQElucHV0KCkgc2V0IHBsYWNlbWVudCh2YWx1ZTogQXZhaWxhYmxlQlNQb3NpdGlvbnMpIHtcbiAgICBpZiAoIXRoaXMuX2JzVmVyc2lvbnMuaXNCczUpIHtcbiAgICAgIHRoaXMuX3BsYWNlbWVudCA9IHZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9wbGFjZW1lbnQgPSBQbGFjZW1lbnRGb3JCczVbdmFsdWUgYXMga2V5b2YgdHlwZW9mIFBsYWNlbWVudEZvckJzNV07XG4gICAgfVxuICB9XG5cbiAgQElucHV0KCkgdGl0bGU/OiBzdHJpbmc7XG5cbiAgY29udGFpbmVyQ2xhc3M/OiBzdHJpbmc7XG4gIHBvcG92ZXJJZD86IHN0cmluZztcbiAgX3BsYWNlbWVudDogQXZhaWxhYmxlQlNQb3NpdGlvbnMgPSAndG9wJztcblxuICBnZXQgX2JzVmVyc2lvbnMoKTogSUJzVmVyc2lvbiB7XG4gICAgcmV0dXJuIGdldEJzVmVyKCk7XG4gIH1cblxuICBjb25zdHJ1Y3Rvcihjb25maWc6IFBvcG92ZXJDb25maWcpIHtcbiAgICBPYmplY3QuYXNzaWduKHRoaXMsIGNvbmZpZyk7XG4gIH1cblxuICBjaGVja01hcmdpbk5lY2Vzc2l0eSgpOiBzdHJpbmcge1xuICAgIHJldHVybiBjaGVja01hcmdpbnModGhpcy5fcGxhY2VtZW50KTtcbiAgfVxufVxuIiwiPGRpdiBjbGFzcz1cInBvcG92ZXItYXJyb3cgYXJyb3dcIj48L2Rpdj5cbjxoMyBjbGFzcz1cInBvcG92ZXItdGl0bGUgcG9wb3Zlci1oZWFkZXJcIiAqbmdJZj1cInRpdGxlXCI+e3sgdGl0bGUgfX08L2gzPlxuPGRpdiBjbGFzcz1cInBvcG92ZXItY29udGVudCBwb3BvdmVyLWJvZHlcIj5cbiAgPG5nLWNvbnRlbnQ+PC9uZy1jb250ZW50PlxuPC9kaXY+XG4iXX0=