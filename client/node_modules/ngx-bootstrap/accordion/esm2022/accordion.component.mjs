import { Component, Input } from '@angular/core';
import { AccordionConfig } from './accordion.config';
import * as i0 from "@angular/core";
import * as i1 from "./accordion.config";
/** Displays collapsible content panels for presenting information in a limited amount of space. */
export class AccordionComponent {
    constructor(config) {
        /** turn on/off animation */
        this.isAnimated = false;
        /** if `true` expanding one item will close all others */
        this.closeOthers = false;
        this.groups = [];
        Object.assign(this, config);
    }
    closeOtherPanels(openGroup) {
        if (!this.closeOthers) {
            return;
        }
        this.groups.forEach((group) => {
            if (group !== openGroup) {
                group.isOpen = false;
            }
        });
    }
    addGroup(group) {
        group.isAnimated = this.isAnimated;
        this.groups.push(group);
    }
    removeGroup(group) {
        const index = this.groups.indexOf(group);
        if (index !== -1) {
            this.groups.splice(index, 1);
        }
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: AccordionComponent, deps: [{ token: i1.AccordionConfig }], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "18.0.1", type: AccordionComponent, isStandalone: true, selector: "accordion", inputs: { isAnimated: "isAnimated", closeOthers: "closeOthers" }, host: { attributes: { "role": "tablist" }, properties: { "attr.aria-multiselectable": "closeOthers" }, styleAttribute: "display: block", classAttribute: "panel-group" }, ngImport: i0, template: `<ng-content></ng-content>`, isInline: true }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: AccordionComponent, decorators: [{
            type: Component,
            args: [{
                    selector: 'accordion',
                    template: `<ng-content></ng-content>`,
                    // eslint-disable-next-line @angular-eslint/no-host-metadata-property
                    host: {
                        '[attr.aria-multiselectable]': 'closeOthers',
                        role: 'tablist',
                        class: 'panel-group',
                        style: 'display: block'
                    },
                    standalone: true
                }]
        }], ctorParameters: () => [{ type: i1.AccordionConfig }], propDecorators: { isAnimated: [{
                type: Input
            }], closeOthers: [{
                type: Input
            }] } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjb3JkaW9uLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9hY2NvcmRpb24vYWNjb3JkaW9uLmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUVqRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7OztBQUVyRCxtR0FBbUc7QUFhbkcsTUFBTSxPQUFPLGtCQUFrQjtJQVE3QixZQUFZLE1BQXVCO1FBUG5DLDRCQUE0QjtRQUNuQixlQUFVLEdBQUcsS0FBSyxDQUFDO1FBQzVCLHlEQUF5RDtRQUNoRCxnQkFBVyxHQUFHLEtBQUssQ0FBQztRQUVuQixXQUFNLEdBQThCLEVBQUUsQ0FBQztRQUcvQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRUQsZ0JBQWdCLENBQUMsU0FBa0M7UUFDakQsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN0QixPQUFPO1FBQ1QsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBOEIsRUFBRSxFQUFFO1lBQ3JELElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUN4QixLQUFLLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztZQUN2QixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsUUFBUSxDQUFDLEtBQThCO1FBQ3JDLEtBQUssQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUNuQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMxQixDQUFDO0lBRUQsV0FBVyxDQUFDLEtBQThCO1FBQ3hDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3pDLElBQUksS0FBSyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDakIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQy9CLENBQUM7SUFDSCxDQUFDOzhHQWxDVSxrQkFBa0I7a0dBQWxCLGtCQUFrQixpVEFWakIsMkJBQTJCOzsyRkFVNUIsa0JBQWtCO2tCQVo5QixTQUFTO21CQUFDO29CQUNQLFFBQVEsRUFBRSxXQUFXO29CQUNyQixRQUFRLEVBQUUsMkJBQTJCO29CQUNyQyxxRUFBcUU7b0JBQ3JFLElBQUksRUFBRTt3QkFDRiw2QkFBNkIsRUFBRSxhQUFhO3dCQUM1QyxJQUFJLEVBQUUsU0FBUzt3QkFDZixLQUFLLEVBQUUsYUFBYTt3QkFDcEIsS0FBSyxFQUFFLGdCQUFnQjtxQkFDMUI7b0JBQ0QsVUFBVSxFQUFFLElBQUk7aUJBQ25CO29GQUdVLFVBQVU7c0JBQWxCLEtBQUs7Z0JBRUcsV0FBVztzQkFBbkIsS0FBSyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbXBvbmVudCwgSW5wdXQgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IEFjY29yZGlvblBhbmVsQ29tcG9uZW50IH0gZnJvbSAnLi9hY2NvcmRpb24tZ3JvdXAuY29tcG9uZW50JztcbmltcG9ydCB7IEFjY29yZGlvbkNvbmZpZyB9IGZyb20gJy4vYWNjb3JkaW9uLmNvbmZpZyc7XG5cbi8qKiBEaXNwbGF5cyBjb2xsYXBzaWJsZSBjb250ZW50IHBhbmVscyBmb3IgcHJlc2VudGluZyBpbmZvcm1hdGlvbiBpbiBhIGxpbWl0ZWQgYW1vdW50IG9mIHNwYWNlLiAqL1xuQENvbXBvbmVudCh7XG4gICAgc2VsZWN0b3I6ICdhY2NvcmRpb24nLFxuICAgIHRlbXBsYXRlOiBgPG5nLWNvbnRlbnQ+PC9uZy1jb250ZW50PmAsXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEBhbmd1bGFyLWVzbGludC9uby1ob3N0LW1ldGFkYXRhLXByb3BlcnR5XG4gICAgaG9zdDoge1xuICAgICAgICAnW2F0dHIuYXJpYS1tdWx0aXNlbGVjdGFibGVdJzogJ2Nsb3NlT3RoZXJzJyxcbiAgICAgICAgcm9sZTogJ3RhYmxpc3QnLFxuICAgICAgICBjbGFzczogJ3BhbmVsLWdyb3VwJyxcbiAgICAgICAgc3R5bGU6ICdkaXNwbGF5OiBibG9jaydcbiAgICB9LFxuICAgIHN0YW5kYWxvbmU6IHRydWVcbn0pXG5leHBvcnQgY2xhc3MgQWNjb3JkaW9uQ29tcG9uZW50IHtcbiAgLyoqIHR1cm4gb24vb2ZmIGFuaW1hdGlvbiAqL1xuICBASW5wdXQoKSBpc0FuaW1hdGVkID0gZmFsc2U7XG4gIC8qKiBpZiBgdHJ1ZWAgZXhwYW5kaW5nIG9uZSBpdGVtIHdpbGwgY2xvc2UgYWxsIG90aGVycyAqL1xuICBASW5wdXQoKSBjbG9zZU90aGVycyA9IGZhbHNlO1xuXG4gIHByb3RlY3RlZCBncm91cHM6IEFjY29yZGlvblBhbmVsQ29tcG9uZW50W10gPSBbXTtcblxuICBjb25zdHJ1Y3Rvcihjb25maWc6IEFjY29yZGlvbkNvbmZpZykge1xuICAgIE9iamVjdC5hc3NpZ24odGhpcywgY29uZmlnKTtcbiAgfVxuXG4gIGNsb3NlT3RoZXJQYW5lbHMob3Blbkdyb3VwOiBBY2NvcmRpb25QYW5lbENvbXBvbmVudCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5jbG9zZU90aGVycykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuZ3JvdXBzLmZvckVhY2goKGdyb3VwOiBBY2NvcmRpb25QYW5lbENvbXBvbmVudCkgPT4ge1xuICAgICAgaWYgKGdyb3VwICE9PSBvcGVuR3JvdXApIHtcbiAgICAgICAgZ3JvdXAuaXNPcGVuID0gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBhZGRHcm91cChncm91cDogQWNjb3JkaW9uUGFuZWxDb21wb25lbnQpOiB2b2lkIHtcbiAgICBncm91cC5pc0FuaW1hdGVkID0gdGhpcy5pc0FuaW1hdGVkO1xuICAgIHRoaXMuZ3JvdXBzLnB1c2goZ3JvdXApO1xuICB9XG5cbiAgcmVtb3ZlR3JvdXAoZ3JvdXA6IEFjY29yZGlvblBhbmVsQ29tcG9uZW50KTogdm9pZCB7XG4gICAgY29uc3QgaW5kZXggPSB0aGlzLmdyb3Vwcy5pbmRleE9mKGdyb3VwKTtcbiAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICB0aGlzLmdyb3Vwcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH1cbiAgfVxufVxuIl19