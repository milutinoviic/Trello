import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NgTranscludeDirective } from './ng-transclude.directive';
import { TabHeadingDirective } from './tab-heading.directive';
import { TabDirective } from './tab.directive';
import { TabsetComponent } from './tabset.component';
import * as i0 from "@angular/core";
export class TabsModule {
    // @deprecated method not required anymore, will be deleted in v19.0.0
    static forRoot() {
        return {
            ngModule: TabsModule,
            providers: []
        };
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: TabsModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule }); }
    static { this.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "18.0.1", ngImport: i0, type: TabsModule, imports: [CommonModule, NgTranscludeDirective,
            TabDirective,
            TabsetComponent,
            TabHeadingDirective], exports: [TabDirective,
            TabsetComponent,
            TabHeadingDirective,
            NgTranscludeDirective] }); }
    static { this.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: TabsModule, imports: [CommonModule] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: TabsModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: [CommonModule, NgTranscludeDirective,
                        TabDirective,
                        TabsetComponent,
                        TabHeadingDirective],
                    exports: [
                        TabDirective,
                        TabsetComponent,
                        TabHeadingDirective,
                        NgTranscludeDirective
                    ]
                }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFicy5tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvdGFicy90YWJzLm1vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDL0MsT0FBTyxFQUFFLFFBQVEsRUFBdUIsTUFBTSxlQUFlLENBQUM7QUFFOUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDbEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDOUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQzs7QUFjckQsTUFBTSxPQUFPLFVBQVU7SUFDckIsc0VBQXNFO0lBQ3RFLE1BQU0sQ0FBQyxPQUFPO1FBQ1osT0FBTztZQUNMLFFBQVEsRUFBRSxVQUFVO1lBQ3BCLFNBQVMsRUFBRSxFQUFFO1NBQ2QsQ0FBQztJQUNKLENBQUM7OEdBUFUsVUFBVTsrR0FBVixVQUFVLFlBWFQsWUFBWSxFQUFFLHFCQUFxQjtZQUN6QyxZQUFZO1lBQ1osZUFBZTtZQUNmLG1CQUFtQixhQUVuQixZQUFZO1lBQ1osZUFBZTtZQUNmLG1CQUFtQjtZQUNuQixxQkFBcUI7K0dBR2hCLFVBQVUsWUFYVCxZQUFZOzsyRkFXYixVQUFVO2tCQVp0QixRQUFRO21CQUFDO29CQUNOLE9BQU8sRUFBRSxDQUFDLFlBQVksRUFBRSxxQkFBcUI7d0JBQ3pDLFlBQVk7d0JBQ1osZUFBZTt3QkFDZixtQkFBbUIsQ0FBQztvQkFDeEIsT0FBTyxFQUFFO3dCQUNMLFlBQVk7d0JBQ1osZUFBZTt3QkFDZixtQkFBbUI7d0JBQ25CLHFCQUFxQjtxQkFDeEI7aUJBQ0oiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21tb25Nb2R1bGUgfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHsgTmdNb2R1bGUsIE1vZHVsZVdpdGhQcm92aWRlcnMgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuaW1wb3J0IHsgTmdUcmFuc2NsdWRlRGlyZWN0aXZlIH0gZnJvbSAnLi9uZy10cmFuc2NsdWRlLmRpcmVjdGl2ZSc7XG5pbXBvcnQgeyBUYWJIZWFkaW5nRGlyZWN0aXZlIH0gZnJvbSAnLi90YWItaGVhZGluZy5kaXJlY3RpdmUnO1xuaW1wb3J0IHsgVGFiRGlyZWN0aXZlIH0gZnJvbSAnLi90YWIuZGlyZWN0aXZlJztcbmltcG9ydCB7IFRhYnNldENvbXBvbmVudCB9IGZyb20gJy4vdGFic2V0LmNvbXBvbmVudCc7XG5cbkBOZ01vZHVsZSh7XG4gICAgaW1wb3J0czogW0NvbW1vbk1vZHVsZSwgTmdUcmFuc2NsdWRlRGlyZWN0aXZlLFxuICAgICAgICBUYWJEaXJlY3RpdmUsXG4gICAgICAgIFRhYnNldENvbXBvbmVudCxcbiAgICAgICAgVGFiSGVhZGluZ0RpcmVjdGl2ZV0sXG4gICAgZXhwb3J0czogW1xuICAgICAgICBUYWJEaXJlY3RpdmUsXG4gICAgICAgIFRhYnNldENvbXBvbmVudCxcbiAgICAgICAgVGFiSGVhZGluZ0RpcmVjdGl2ZSxcbiAgICAgICAgTmdUcmFuc2NsdWRlRGlyZWN0aXZlXG4gICAgXVxufSlcbmV4cG9ydCBjbGFzcyBUYWJzTW9kdWxlIHtcbiAgLy8gQGRlcHJlY2F0ZWQgbWV0aG9kIG5vdCByZXF1aXJlZCBhbnltb3JlLCB3aWxsIGJlIGRlbGV0ZWQgaW4gdjE5LjAuMFxuICBzdGF0aWMgZm9yUm9vdCgpOiBNb2R1bGVXaXRoUHJvdmlkZXJzPFRhYnNNb2R1bGU+IHtcbiAgICByZXR1cm4ge1xuICAgICAgbmdNb2R1bGU6IFRhYnNNb2R1bGUsXG4gICAgICBwcm92aWRlcnM6IFtdXG4gICAgfTtcbiAgfVxufVxuIl19