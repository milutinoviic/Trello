import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Observable } from "rxjs";
import { Injectable } from '@angular/core';

@Injectable()
export class Interceptor implements HttpInterceptor{

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    console.log("presretnuto");
    const item = localStorage.getItem("token") as string;
    const decodedItem = JSON.parse(item);
    console.log("PRESRETNUTO");
    console.log(item);
    if (item) {
      console.log(decodedItem.token);
      console.log("HHH");
      const cloned = req.clone({
        setHeaders: {
          Authorization: `Bearer ${decodedItem.accessToken || decodedItem}`
        }
      });
      console.log(cloned);

      return next.handle(cloned);
    } else {
      return next.handle(req);
    }
  }
}
