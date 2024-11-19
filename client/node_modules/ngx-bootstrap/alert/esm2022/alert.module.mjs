import { NgModule } from '@angular/core';
import { AlertComponent } from './alert.component';
import * as i0 from "@angular/core";
export class AlertModule {
    // @deprecated method not required anymore, will be deleted in v19.0.0
    static forRoot() {
        return {
            ngModule: AlertModule,
            providers: []
        };
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: AlertModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule }); }
    static { this.ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "18.0.1", ngImport: i0, type: AlertModule, imports: [AlertComponent], exports: [AlertComponent] }); }
    static { this.ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: AlertModule }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.0.1", ngImport: i0, type: AlertModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: [AlertComponent],
                    exports: [AlertComponent]
                }]
        }] });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxlcnQubW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2FsZXJ0L2FsZXJ0Lm1vZHVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQXVCLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUM5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7O0FBTW5ELE1BQU0sT0FBTyxXQUFXO0lBQ3RCLHNFQUFzRTtJQUN0RSxNQUFNLENBQUMsT0FBTztRQUNaLE9BQU87WUFDTCxRQUFRLEVBQUUsV0FBVztZQUNyQixTQUFTLEVBQUUsRUFBRTtTQUNkLENBQUM7SUFDSixDQUFDOzhHQVBVLFdBQVc7K0dBQVgsV0FBVyxZQUhWLGNBQWMsYUFDZCxjQUFjOytHQUVmLFdBQVc7OzJGQUFYLFdBQVc7a0JBSnZCLFFBQVE7bUJBQUM7b0JBQ04sT0FBTyxFQUFFLENBQUMsY0FBYyxDQUFDO29CQUN6QixPQUFPLEVBQUUsQ0FBQyxjQUFjLENBQUM7aUJBQzVCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTW9kdWxlV2l0aFByb3ZpZGVycywgTmdNb2R1bGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IEFsZXJ0Q29tcG9uZW50IH0gZnJvbSAnLi9hbGVydC5jb21wb25lbnQnO1xuXG5ATmdNb2R1bGUoe1xuICAgIGltcG9ydHM6IFtBbGVydENvbXBvbmVudF0sXG4gICAgZXhwb3J0czogW0FsZXJ0Q29tcG9uZW50XVxufSlcbmV4cG9ydCBjbGFzcyBBbGVydE1vZHVsZSB7XG4gIC8vIEBkZXByZWNhdGVkIG1ldGhvZCBub3QgcmVxdWlyZWQgYW55bW9yZSwgd2lsbCBiZSBkZWxldGVkIGluIHYxOS4wLjBcbiAgc3RhdGljIGZvclJvb3QoKTogTW9kdWxlV2l0aFByb3ZpZGVyczxBbGVydE1vZHVsZT4ge1xuICAgIHJldHVybiB7XG4gICAgICBuZ01vZHVsZTogQWxlcnRNb2R1bGUsXG4gICAgICBwcm92aWRlcnM6IFtdXG4gICAgfTtcbiAgfVxufVxuIl19