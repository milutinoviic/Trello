// ! moment.js locale configuration
// ! locale : Romanian [ro]
//! author : Vlad Gurdiga : https://github.com/gurdiga
//! author : Valentin Agachi : https://github.com/avaly
// ! author : Earle white: https://github.com/5earle
function relativeTimeWithPlural(num, withoutSuffix, key) {
    let format = {
        ss: 'secunde',
        mm: 'minute',
        hh: 'ore',
        dd: 'zile',
        MM: 'luni',
        yy: 'ani'
    };
    let separator = ' ';
    if (num % 100 >= 20 || (num >= 100 && num % 100 === 0)) {
        separator = ' de ';
    }
    return num + separator + format[key];
}
export const roLocale = {
    abbr: 'ro',
    months: 'ianuarie_februarie_martie_aprilie_mai_iunie_iulie_august_septembrie_octombrie_noiembrie_decembrie'.split('_'),
    monthsShort: 'ian._febr._mart._apr._mai_iun._iul._aug._sept._oct._nov._dec.'.split('_'),
    monthsParseExact: true,
    weekdays: 'duminică_luni_marți_miercuri_joi_vineri_sâmbătă'.split('_'),
    weekdaysShort: 'Dum_Lun_Mar_Mie_Joi_Vin_Sâm'.split('_'),
    weekdaysMin: 'Du_Lu_Ma_Mi_Jo_Vi_Sâ'.split('_'),
    longDateFormat: {
        LT: 'H:mm',
        LTS: 'H:mm:ss',
        L: 'DD.MM.YYYY',
        LL: 'D MMMM YYYY',
        LLL: 'D MMMM YYYY H:mm',
        LLLL: 'dddd, D MMMM YYYY H:mm'
    },
    calendar: {
        sameDay: '[azi la] LT',
        nextDay: '[mâine la] LT',
        nextWeek: 'dddd [la] LT',
        lastDay: '[ieri la] LT',
        lastWeek: '[fosta] dddd [la] LT',
        sameElse: 'L'
    },
    relativeTime: {
        future: 'peste %s',
        past: '%s în urmă',
        s: 'câteva secunde',
        ss: relativeTimeWithPlural,
        m: 'un minut',
        mm: relativeTimeWithPlural,
        h: 'o oră',
        hh: relativeTimeWithPlural,
        d: 'o zi',
        dd: relativeTimeWithPlural,
        M: 'o lună',
        MM: relativeTimeWithPlural,
        y: 'un an',
        yy: relativeTimeWithPlural
    },
    week: {
        dow: 1, // Monday is the first day of the week.
        doy: 7 // The week that contains Jan 1st is the first week of the year.
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm8uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvY2hyb25vcy9pMThuL3JvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBLG1DQUFtQztBQUNuQywyQkFBMkI7QUFDM0Isc0RBQXNEO0FBQ3RELHVEQUF1RDtBQUN2RCxvREFBb0Q7QUFFcEQsU0FBUyxzQkFBc0IsQ0FBQyxHQUFXLEVBQUUsYUFBc0IsRUFBRSxHQUFXO0lBQzlFLElBQUksTUFBTSxHQUEyQjtRQUNuQyxFQUFFLEVBQUUsU0FBUztRQUNiLEVBQUUsRUFBRSxRQUFRO1FBQ1osRUFBRSxFQUFFLEtBQUs7UUFDVCxFQUFFLEVBQUUsTUFBTTtRQUNWLEVBQUUsRUFBRSxNQUFNO1FBQ1YsRUFBRSxFQUFFLEtBQUs7S0FDVixDQUFDO0lBRUYsSUFBSSxTQUFTLEdBQUcsR0FBRyxDQUFDO0lBQ3BCLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUN2RCxTQUFTLEdBQUcsTUFBTSxDQUFDO0lBQ3JCLENBQUM7SUFDRCxPQUFPLEdBQUcsR0FBRyxTQUFTLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3ZDLENBQUM7QUFHRCxNQUFNLENBQUMsTUFBTSxRQUFRLEdBQWU7SUFDbEMsSUFBSSxFQUFFLElBQUk7SUFDVixNQUFNLEVBQUUsbUdBQW1HLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztJQUN0SCxXQUFXLEVBQUUsK0RBQStELENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztJQUN2RixnQkFBZ0IsRUFBRSxJQUFJO0lBQ3RCLFFBQVEsRUFBRSxpREFBaUQsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQ3RFLGFBQWEsRUFBRSw2QkFBNkIsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQ3ZELFdBQVcsRUFBRSxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQzlDLGNBQWMsRUFBRTtRQUNkLEVBQUUsRUFBRSxNQUFNO1FBQ1YsR0FBRyxFQUFFLFNBQVM7UUFDZCxDQUFDLEVBQUUsWUFBWTtRQUNmLEVBQUUsRUFBRSxhQUFhO1FBQ2pCLEdBQUcsRUFBRSxrQkFBa0I7UUFDdkIsSUFBSSxFQUFFLHdCQUF3QjtLQUMvQjtJQUNELFFBQVEsRUFBRTtRQUNSLE9BQU8sRUFBRSxhQUFhO1FBQ3RCLE9BQU8sRUFBRSxlQUFlO1FBQ3hCLFFBQVEsRUFBRSxjQUFjO1FBQ3hCLE9BQU8sRUFBRSxjQUFjO1FBQ3ZCLFFBQVEsRUFBRSxzQkFBc0I7UUFDaEMsUUFBUSxFQUFFLEdBQUc7S0FDZDtJQUNELFlBQVksRUFBRTtRQUNaLE1BQU0sRUFBRSxVQUFVO1FBQ2xCLElBQUksRUFBRSxZQUFZO1FBQ2xCLENBQUMsRUFBRSxnQkFBZ0I7UUFDbkIsRUFBRSxFQUFFLHNCQUFzQjtRQUMxQixDQUFDLEVBQUUsVUFBVTtRQUNiLEVBQUUsRUFBRSxzQkFBc0I7UUFDMUIsQ0FBQyxFQUFFLE9BQU87UUFDVixFQUFFLEVBQUUsc0JBQXNCO1FBQzFCLENBQUMsRUFBRSxNQUFNO1FBQ1QsRUFBRSxFQUFFLHNCQUFzQjtRQUMxQixDQUFDLEVBQUUsUUFBUTtRQUNYLEVBQUUsRUFBRSxzQkFBc0I7UUFDMUIsQ0FBQyxFQUFFLE9BQU87UUFDVixFQUFFLEVBQUUsc0JBQXNCO0tBQzNCO0lBQ0QsSUFBSSxFQUFFO1FBQ0osR0FBRyxFQUFFLENBQUMsRUFBRSx1Q0FBdUM7UUFDL0MsR0FBRyxFQUFFLENBQUMsQ0FBRSxnRUFBZ0U7S0FDekU7Q0FDRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTG9jYWxlRGF0YSB9IGZyb20gJy4uL2xvY2FsZS9sb2NhbGUuY2xhc3MnO1xuXG4vLyAhIG1vbWVudC5qcyBsb2NhbGUgY29uZmlndXJhdGlvblxuLy8gISBsb2NhbGUgOiBSb21hbmlhbiBbcm9dXG4vLyEgYXV0aG9yIDogVmxhZCBHdXJkaWdhIDogaHR0cHM6Ly9naXRodWIuY29tL2d1cmRpZ2Fcbi8vISBhdXRob3IgOiBWYWxlbnRpbiBBZ2FjaGkgOiBodHRwczovL2dpdGh1Yi5jb20vYXZhbHlcbi8vICEgYXV0aG9yIDogRWFybGUgd2hpdGU6IGh0dHBzOi8vZ2l0aHViLmNvbS81ZWFybGVcblxuZnVuY3Rpb24gcmVsYXRpdmVUaW1lV2l0aFBsdXJhbChudW06IG51bWJlciwgd2l0aG91dFN1ZmZpeDogYm9vbGVhbiwga2V5OiBzdHJpbmcpOiBzdHJpbmcge1xuICBsZXQgZm9ybWF0OiB7W2tleTpzdHJpbmddOiBzdHJpbmd9ID0ge1xuICAgIHNzOiAnc2VjdW5kZScsXG4gICAgbW06ICdtaW51dGUnLFxuICAgIGhoOiAnb3JlJyxcbiAgICBkZDogJ3ppbGUnLFxuICAgIE1NOiAnbHVuaScsXG4gICAgeXk6ICdhbmknXG4gIH07XG5cbiAgbGV0IHNlcGFyYXRvciA9ICcgJztcbiAgaWYgKG51bSAlIDEwMCA+PSAyMCB8fCAobnVtID49IDEwMCAmJiBudW0gJSAxMDAgPT09IDApKSB7XG4gICAgc2VwYXJhdG9yID0gJyBkZSAnO1xuICB9XG4gIHJldHVybiBudW0gKyBzZXBhcmF0b3IgKyBmb3JtYXRba2V5XTtcbn1cblxuXG5leHBvcnQgY29uc3Qgcm9Mb2NhbGU6IExvY2FsZURhdGEgPSB7XG4gIGFiYnI6ICdybycsXG4gIG1vbnRoczogJ2lhbnVhcmllX2ZlYnJ1YXJpZV9tYXJ0aWVfYXByaWxpZV9tYWlfaXVuaWVfaXVsaWVfYXVndXN0X3NlcHRlbWJyaWVfb2N0b21icmllX25vaWVtYnJpZV9kZWNlbWJyaWUnLnNwbGl0KCdfJyksXG4gIG1vbnRoc1Nob3J0OiAnaWFuLl9mZWJyLl9tYXJ0Ll9hcHIuX21haV9pdW4uX2l1bC5fYXVnLl9zZXB0Ll9vY3QuX25vdi5fZGVjLicuc3BsaXQoJ18nKSxcbiAgbW9udGhzUGFyc2VFeGFjdDogdHJ1ZSxcbiAgd2Vla2RheXM6ICdkdW1pbmljxINfbHVuaV9tYXLIm2lfbWllcmN1cmlfam9pX3ZpbmVyaV9zw6JtYsSDdMSDJy5zcGxpdCgnXycpLFxuICB3ZWVrZGF5c1Nob3J0OiAnRHVtX0x1bl9NYXJfTWllX0pvaV9WaW5fU8OibScuc3BsaXQoJ18nKSxcbiAgd2Vla2RheXNNaW46ICdEdV9MdV9NYV9NaV9Kb19WaV9Tw6InLnNwbGl0KCdfJyksXG4gIGxvbmdEYXRlRm9ybWF0OiB7XG4gICAgTFQ6ICdIOm1tJyxcbiAgICBMVFM6ICdIOm1tOnNzJyxcbiAgICBMOiAnREQuTU0uWVlZWScsXG4gICAgTEw6ICdEIE1NTU0gWVlZWScsXG4gICAgTExMOiAnRCBNTU1NIFlZWVkgSDptbScsXG4gICAgTExMTDogJ2RkZGQsIEQgTU1NTSBZWVlZIEg6bW0nXG4gIH0sXG4gIGNhbGVuZGFyOiB7XG4gICAgc2FtZURheTogJ1themkgbGFdIExUJyxcbiAgICBuZXh0RGF5OiAnW23DomluZSBsYV0gTFQnLFxuICAgIG5leHRXZWVrOiAnZGRkZCBbbGFdIExUJyxcbiAgICBsYXN0RGF5OiAnW2llcmkgbGFdIExUJyxcbiAgICBsYXN0V2VlazogJ1tmb3N0YV0gZGRkZCBbbGFdIExUJyxcbiAgICBzYW1lRWxzZTogJ0wnXG4gIH0sXG4gIHJlbGF0aXZlVGltZToge1xuICAgIGZ1dHVyZTogJ3Blc3RlICVzJyxcbiAgICBwYXN0OiAnJXMgw65uIHVybcSDJyxcbiAgICBzOiAnY8OidGV2YSBzZWN1bmRlJyxcbiAgICBzczogcmVsYXRpdmVUaW1lV2l0aFBsdXJhbCxcbiAgICBtOiAndW4gbWludXQnLFxuICAgIG1tOiByZWxhdGl2ZVRpbWVXaXRoUGx1cmFsLFxuICAgIGg6ICdvIG9yxIMnLFxuICAgIGhoOiByZWxhdGl2ZVRpbWVXaXRoUGx1cmFsLFxuICAgIGQ6ICdvIHppJyxcbiAgICBkZDogcmVsYXRpdmVUaW1lV2l0aFBsdXJhbCxcbiAgICBNOiAnbyBsdW7EgycsXG4gICAgTU06IHJlbGF0aXZlVGltZVdpdGhQbHVyYWwsXG4gICAgeTogJ3VuIGFuJyxcbiAgICB5eTogcmVsYXRpdmVUaW1lV2l0aFBsdXJhbFxuICB9LFxuICB3ZWVrOiB7XG4gICAgZG93OiAxLCAvLyBNb25kYXkgaXMgdGhlIGZpcnN0IGRheSBvZiB0aGUgd2Vlay5cbiAgICBkb3k6IDcgIC8vIFRoZSB3ZWVrIHRoYXQgY29udGFpbnMgSmFuIDFzdCBpcyB0aGUgZmlyc3Qgd2VlayBvZiB0aGUgeWVhci5cbiAgfVxufTtcbiJdfQ==