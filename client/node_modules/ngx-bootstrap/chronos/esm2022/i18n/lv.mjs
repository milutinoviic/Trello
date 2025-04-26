//! moment.js locale configuration
//! locale : Latvian [lv]
//! author : Matiss Janis Aboltins : https://github.com/matissjanis
export const lvLocale = {
    abbr: 'lv',
    months: 'Janvāris_Februāris_Marts_Aprīlis_Maijs_Jūnijs_Jūlijs_Augusts_Septembris_Oktobris_Novembris_Decembris'.split('_'),
    monthsShort: 'Jan_Feb_Mar_Apr_Mai_Jūn_Jūl_Aug_Sep_Okt_Nov_Dec'.split('_'),
    weekdays: 'Svētdiena_Pirmdiena_Otrdiena_Trešdiena_Ceturtdiena_Piektdiena_Sestdiena'.split('_'),
    weekdaysShort: 'Svētd_Pirmd_Otrd_Trešd_Ceturtd_Piektd_Sestd'.split('_'),
    weekdaysMin: 'Sv_Pi_Ot_Tr_Ce_Pk_Se'.split('_'),
    longDateFormat: {
        LT: 'HH:mm',
        LTS: 'HH:mm:ss',
        L: 'DD/MM/YYYY',
        LL: 'D MMMM YYYY',
        LLL: 'D MMMM YYYY HH:mm',
        LLLL: 'dddd, D MMMM YYYY HH:mm'
    },
    calendar: {
        sameDay: '[Today at] LT',
        nextDay: '[Tomorrow at] LT',
        nextWeek: 'dddd [at] LT',
        lastDay: '[Yesterday at] LT',
        lastWeek: '[Last] dddd [at] LT',
        sameElse: 'L'
    },
    relativeTime: {
        future: 'pēc %s',
        past: 'pirms %s',
        s: 'dažām sekundēm',
        ss: '%d sekundēm',
        m: 'minūtes',
        mm: '%d minūtēm',
        h: 'stundas',
        hh: '%d stundām',
        d: 'dienas',
        dd: '%d dienām',
        M: 'mēneša',
        MM: '%d mēnešiem',
        y: 'gada',
        yy: '%d gadiem'
    },
    dayOfMonthOrdinalParse: /\d{1,2}\./,
    ordinal(num) {
        return num + '.';
    },
    week: {
        dow: 1, // Monday is the first day of the week.
        doy: 4 // The week that contains Jan 4th is the first week of the year.
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibHYuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvY2hyb25vcy9pMThuL2x2LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBLGtDQUFrQztBQUNsQyx5QkFBeUI7QUFDekIsbUVBQW1FO0FBRW5FLE1BQU0sQ0FBQyxNQUFNLFFBQVEsR0FBZTtJQUNsQyxJQUFJLEVBQUUsSUFBSTtJQUNWLE1BQU0sRUFBRyxzR0FBc0csQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQzFILFdBQVcsRUFBRyxpREFBaUQsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQzFFLFFBQVEsRUFBRyx5RUFBeUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQy9GLGFBQWEsRUFBRyw2Q0FBNkMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQ3hFLFdBQVcsRUFBRyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQy9DLGNBQWMsRUFBRztRQUNmLEVBQUUsRUFBRyxPQUFPO1FBQ1osR0FBRyxFQUFHLFVBQVU7UUFDaEIsQ0FBQyxFQUFHLFlBQVk7UUFDaEIsRUFBRSxFQUFHLGFBQWE7UUFDbEIsR0FBRyxFQUFHLG1CQUFtQjtRQUN6QixJQUFJLEVBQUcseUJBQXlCO0tBQ2pDO0lBQ0QsUUFBUSxFQUFHO1FBQ1QsT0FBTyxFQUFHLGVBQWU7UUFDekIsT0FBTyxFQUFHLGtCQUFrQjtRQUM1QixRQUFRLEVBQUcsY0FBYztRQUN6QixPQUFPLEVBQUcsbUJBQW1CO1FBQzdCLFFBQVEsRUFBRyxxQkFBcUI7UUFDaEMsUUFBUSxFQUFHLEdBQUc7S0FDZjtJQUNELFlBQVksRUFBRztRQUNiLE1BQU0sRUFBRyxRQUFRO1FBQ2pCLElBQUksRUFBRyxVQUFVO1FBQ2pCLENBQUMsRUFBRyxnQkFBZ0I7UUFDcEIsRUFBRSxFQUFHLGFBQWE7UUFDbEIsQ0FBQyxFQUFHLFNBQVM7UUFDYixFQUFFLEVBQUcsWUFBWTtRQUNqQixDQUFDLEVBQUcsU0FBUztRQUNiLEVBQUUsRUFBRyxZQUFZO1FBQ2pCLENBQUMsRUFBRyxRQUFRO1FBQ1osRUFBRSxFQUFHLFdBQVc7UUFDaEIsQ0FBQyxFQUFHLFFBQVE7UUFDWixFQUFFLEVBQUcsYUFBYTtRQUNsQixDQUFDLEVBQUcsTUFBTTtRQUNWLEVBQUUsRUFBRyxXQUFXO0tBQ2pCO0lBQ0Qsc0JBQXNCLEVBQUUsV0FBVztJQUNuQyxPQUFPLENBQUMsR0FBRztRQUNQLE9BQU8sR0FBRyxHQUFHLEdBQUcsQ0FBQztJQUNyQixDQUFDO0lBQ0QsSUFBSSxFQUFHO1FBQ0wsR0FBRyxFQUFHLENBQUMsRUFBRSx1Q0FBdUM7UUFDaEQsR0FBRyxFQUFHLENBQUMsQ0FBRSxnRUFBZ0U7S0FDMUU7Q0FDRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTG9jYWxlRGF0YSB9IGZyb20gJy4uL2xvY2FsZS9sb2NhbGUuY2xhc3MnO1xuXG4vLyEgbW9tZW50LmpzIGxvY2FsZSBjb25maWd1cmF0aW9uXG4vLyEgbG9jYWxlIDogTGF0dmlhbiBbbHZdXG4vLyEgYXV0aG9yIDogTWF0aXNzIEphbmlzIEFib2x0aW5zIDogaHR0cHM6Ly9naXRodWIuY29tL21hdGlzc2phbmlzXG5cbmV4cG9ydCBjb25zdCBsdkxvY2FsZTogTG9jYWxlRGF0YSA9IHtcbiAgYWJicjogJ2x2JyxcbiAgbW9udGhzIDogJ0phbnbEgXJpc19GZWJydcSBcmlzX01hcnRzX0FwcsSrbGlzX01haWpzX0rFq25panNfSsWrbGlqc19BdWd1c3RzX1NlcHRlbWJyaXNfT2t0b2JyaXNfTm92ZW1icmlzX0RlY2VtYnJpcycuc3BsaXQoJ18nKSxcbiAgbW9udGhzU2hvcnQgOiAnSmFuX0ZlYl9NYXJfQXByX01haV9KxatuX0rFq2xfQXVnX1NlcF9Pa3RfTm92X0RlYycuc3BsaXQoJ18nKSxcbiAgd2Vla2RheXMgOiAnU3bEk3RkaWVuYV9QaXJtZGllbmFfT3RyZGllbmFfVHJlxaFkaWVuYV9DZXR1cnRkaWVuYV9QaWVrdGRpZW5hX1Nlc3RkaWVuYScuc3BsaXQoJ18nKSxcbiAgd2Vla2RheXNTaG9ydCA6ICdTdsSTdGRfUGlybWRfT3RyZF9UcmXFoWRfQ2V0dXJ0ZF9QaWVrdGRfU2VzdGQnLnNwbGl0KCdfJyksXG4gIHdlZWtkYXlzTWluIDogJ1N2X1BpX090X1RyX0NlX1BrX1NlJy5zcGxpdCgnXycpLFxuICBsb25nRGF0ZUZvcm1hdCA6IHtcbiAgICBMVCA6ICdISDptbScsXG4gICAgTFRTIDogJ0hIOm1tOnNzJyxcbiAgICBMIDogJ0REL01NL1lZWVknLFxuICAgIExMIDogJ0QgTU1NTSBZWVlZJyxcbiAgICBMTEwgOiAnRCBNTU1NIFlZWVkgSEg6bW0nLFxuICAgIExMTEwgOiAnZGRkZCwgRCBNTU1NIFlZWVkgSEg6bW0nXG4gIH0sXG4gIGNhbGVuZGFyIDoge1xuICAgIHNhbWVEYXkgOiAnW1RvZGF5IGF0XSBMVCcsXG4gICAgbmV4dERheSA6ICdbVG9tb3Jyb3cgYXRdIExUJyxcbiAgICBuZXh0V2VlayA6ICdkZGRkIFthdF0gTFQnLFxuICAgIGxhc3REYXkgOiAnW1llc3RlcmRheSBhdF0gTFQnLFxuICAgIGxhc3RXZWVrIDogJ1tMYXN0XSBkZGRkIFthdF0gTFQnLFxuICAgIHNhbWVFbHNlIDogJ0wnXG4gIH0sXG4gIHJlbGF0aXZlVGltZSA6IHtcbiAgICBmdXR1cmUgOiAncMSTYyAlcycsXG4gICAgcGFzdCA6ICdwaXJtcyAlcycsXG4gICAgcyA6ICdkYcW+xIFtIHNla3VuZMSTbScsXG4gICAgc3MgOiAnJWQgc2VrdW5kxJNtJyxcbiAgICBtIDogJ21pbsWrdGVzJyxcbiAgICBtbSA6ICclZCBtaW7Fq3TEk20nLFxuICAgIGggOiAnc3R1bmRhcycsXG4gICAgaGggOiAnJWQgc3R1bmTEgW0nLFxuICAgIGQgOiAnZGllbmFzJyxcbiAgICBkZCA6ICclZCBkaWVuxIFtJyxcbiAgICBNIDogJ23Ek25lxaFhJyxcbiAgICBNTSA6ICclZCBtxJNuZcWhaWVtJyxcbiAgICB5IDogJ2dhZGEnLFxuICAgIHl5IDogJyVkIGdhZGllbSdcbiAgfSxcbiAgZGF5T2ZNb250aE9yZGluYWxQYXJzZTogL1xcZHsxLDJ9XFwuLyxcbiAgb3JkaW5hbChudW0pIHtcbiAgICAgIHJldHVybiBudW0gKyAnLic7XG4gIH0sXG4gIHdlZWsgOiB7XG4gICAgZG93IDogMSwgLy8gTW9uZGF5IGlzIHRoZSBmaXJzdCBkYXkgb2YgdGhlIHdlZWsuXG4gICAgZG95IDogNCAgLy8gVGhlIHdlZWsgdGhhdCBjb250YWlucyBKYW4gNHRoIGlzIHRoZSBmaXJzdCB3ZWVrIG9mIHRoZSB5ZWFyLlxuICB9XG59O1xuIl19