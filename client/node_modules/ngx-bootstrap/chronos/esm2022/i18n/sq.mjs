//! moment.js locale configuration
//! locale : Albanian [sq]
//! author : Agon Cecelia : https://github.com/agoncecelia
export const sqLocale = {
    abbr: 'sq',
    months: 'Janar_Shkurt_Mars_Prill_Maj_Qershor_Korrik_Gusht_Shtator_Tetor_Nëntor_Dhjetor'.split('_'),
    monthsShort: 'Jan_Shk_Mar_Pri_Maj_Qer_Kor_Gus_Sht_Tet_Nën_Dhj'.split('_'),
    weekdays: 'E Dielë_E Hënë_E Martë_E Mërkurë_E Enjte_E Premte_E Shtunë'.split('_'),
    weekdaysShort: 'Die_Hën_Mar_Mër_Enj_Pre_Sht'.split('_'),
    weekdaysMin: 'Di_He_Ma_Me_En_Pr_Sh'.split('_'),
    longDateFormat: {
        LT: 'HH:mm',
        LTS: 'HH:mm:ss',
        L: 'DD/MM/YYYY',
        LL: 'D MMMM YYYY',
        LLL: 'D MMMM YYYY HH:mm',
        LLLL: 'dddd, D MMMM YYYY HH:mm'
    },
    calendar: {
        sameDay: '[Sot në] LT',
        nextDay: '[Nesër në] LT',
        nextWeek: 'dddd [në] LT',
        lastDay: '[Dje në] LT',
        lastWeek: 'dddd [e kaluar në] LT',
        sameElse: 'L'
    },
    relativeTime: {
        future: 'në %s',
        past: 'para %sve',
        s: 'disa sekonda',
        ss: '%d sekonda',
        m: 'një minut',
        mm: '%d minuta',
        h: 'një orë',
        hh: '%d orë',
        d: 'një ditë',
        dd: '%d ditë',
        M: 'një muaj',
        MM: '%d muaj',
        y: 'një vit',
        yy: '%d vite'
    },
    dayOfMonthOrdinalParse: /\d{1,2}\./, // need clarification
    ordinal: '%d.', // need clarification
    week: {
        dow: 1, // Monday is the first day of the week.
        doy: 4 // The week that contains Jan 4th is the first week of the year.
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3EuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvY2hyb25vcy9pMThuL3NxLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBLGtDQUFrQztBQUNsQywwQkFBMEI7QUFDMUIsMERBQTBEO0FBRTFELE1BQU0sQ0FBQyxNQUFNLFFBQVEsR0FBZTtJQUNsQyxJQUFJLEVBQUUsSUFBSTtJQUNWLE1BQU0sRUFBRywrRUFBK0UsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQ25HLFdBQVcsRUFBRyxpREFBaUQsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQzFFLFFBQVEsRUFBRyw0REFBNEQsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQ2xGLGFBQWEsRUFBRyw2QkFBNkIsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQ3hELFdBQVcsRUFBRyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQy9DLGNBQWMsRUFBRztRQUNmLEVBQUUsRUFBRyxPQUFPO1FBQ1osR0FBRyxFQUFHLFVBQVU7UUFDaEIsQ0FBQyxFQUFHLFlBQVk7UUFDaEIsRUFBRSxFQUFHLGFBQWE7UUFDbEIsR0FBRyxFQUFHLG1CQUFtQjtRQUN6QixJQUFJLEVBQUcseUJBQXlCO0tBQ2pDO0lBQ0QsUUFBUSxFQUFHO1FBQ1QsT0FBTyxFQUFHLGFBQWE7UUFDdkIsT0FBTyxFQUFHLGVBQWU7UUFDekIsUUFBUSxFQUFHLGNBQWM7UUFDekIsT0FBTyxFQUFHLGFBQWE7UUFDdkIsUUFBUSxFQUFHLHVCQUF1QjtRQUNsQyxRQUFRLEVBQUcsR0FBRztLQUNmO0lBQ0QsWUFBWSxFQUFHO1FBQ2IsTUFBTSxFQUFHLE9BQU87UUFDaEIsSUFBSSxFQUFHLFdBQVc7UUFDbEIsQ0FBQyxFQUFHLGNBQWM7UUFDbEIsRUFBRSxFQUFHLFlBQVk7UUFDakIsQ0FBQyxFQUFHLFdBQVc7UUFDZixFQUFFLEVBQUcsV0FBVztRQUNoQixDQUFDLEVBQUcsU0FBUztRQUNiLEVBQUUsRUFBRyxRQUFRO1FBQ2IsQ0FBQyxFQUFHLFVBQVU7UUFDZCxFQUFFLEVBQUcsU0FBUztRQUNkLENBQUMsRUFBRyxVQUFVO1FBQ2QsRUFBRSxFQUFHLFNBQVM7UUFDZCxDQUFDLEVBQUcsU0FBUztRQUNiLEVBQUUsRUFBRyxTQUFTO0tBQ2Y7SUFDRCxzQkFBc0IsRUFBRSxXQUFXLEVBQUUscUJBQXFCO0lBQzFELE9BQU8sRUFBRyxLQUFLLEVBQUUscUJBQXFCO0lBQ3RDLElBQUksRUFBRztRQUNMLEdBQUcsRUFBRyxDQUFDLEVBQUUsdUNBQXVDO1FBQ2hELEdBQUcsRUFBRyxDQUFDLENBQUUsZ0VBQWdFO0tBQzFFO0NBQ0YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IExvY2FsZURhdGEgfSBmcm9tICcuLi9sb2NhbGUvbG9jYWxlLmNsYXNzJztcblxuLy8hIG1vbWVudC5qcyBsb2NhbGUgY29uZmlndXJhdGlvblxuLy8hIGxvY2FsZSA6IEFsYmFuaWFuIFtzcV1cbi8vISBhdXRob3IgOiBBZ29uIENlY2VsaWEgOiBodHRwczovL2dpdGh1Yi5jb20vYWdvbmNlY2VsaWFcblxuZXhwb3J0IGNvbnN0IHNxTG9jYWxlOiBMb2NhbGVEYXRhID0ge1xuICBhYmJyOiAnc3EnLFxuICBtb250aHMgOiAnSmFuYXJfU2hrdXJ0X01hcnNfUHJpbGxfTWFqX1FlcnNob3JfS29ycmlrX0d1c2h0X1NodGF0b3JfVGV0b3JfTsOrbnRvcl9EaGpldG9yJy5zcGxpdCgnXycpLFxuICBtb250aHNTaG9ydCA6ICdKYW5fU2hrX01hcl9QcmlfTWFqX1Flcl9Lb3JfR3VzX1NodF9UZXRfTsOrbl9EaGonLnNwbGl0KCdfJyksXG4gIHdlZWtkYXlzIDogJ0UgRGllbMOrX0UgSMOrbsOrX0UgTWFydMOrX0UgTcOrcmt1csOrX0UgRW5qdGVfRSBQcmVtdGVfRSBTaHR1bsOrJy5zcGxpdCgnXycpLFxuICB3ZWVrZGF5c1Nob3J0IDogJ0RpZV9Iw6tuX01hcl9Nw6tyX0Vual9QcmVfU2h0Jy5zcGxpdCgnXycpLFxuICB3ZWVrZGF5c01pbiA6ICdEaV9IZV9NYV9NZV9Fbl9Qcl9TaCcuc3BsaXQoJ18nKSxcbiAgbG9uZ0RhdGVGb3JtYXQgOiB7XG4gICAgTFQgOiAnSEg6bW0nLFxuICAgIExUUyA6ICdISDptbTpzcycsXG4gICAgTCA6ICdERC9NTS9ZWVlZJyxcbiAgICBMTCA6ICdEIE1NTU0gWVlZWScsXG4gICAgTExMIDogJ0QgTU1NTSBZWVlZIEhIOm1tJyxcbiAgICBMTExMIDogJ2RkZGQsIEQgTU1NTSBZWVlZIEhIOm1tJ1xuICB9LFxuICBjYWxlbmRhciA6IHtcbiAgICBzYW1lRGF5IDogJ1tTb3QgbsOrXSBMVCcsXG4gICAgbmV4dERheSA6ICdbTmVzw6tyIG7Dq10gTFQnLFxuICAgIG5leHRXZWVrIDogJ2RkZGQgW27Dq10gTFQnLFxuICAgIGxhc3REYXkgOiAnW0RqZSBuw6tdIExUJyxcbiAgICBsYXN0V2VlayA6ICdkZGRkIFtlIGthbHVhciBuw6tdIExUJyxcbiAgICBzYW1lRWxzZSA6ICdMJ1xuICB9LFxuICByZWxhdGl2ZVRpbWUgOiB7XG4gICAgZnV0dXJlIDogJ27DqyAlcycsXG4gICAgcGFzdCA6ICdwYXJhICVzdmUnLFxuICAgIHMgOiAnZGlzYSBzZWtvbmRhJyxcbiAgICBzcyA6ICclZCBzZWtvbmRhJyxcbiAgICBtIDogJ25qw6sgbWludXQnLFxuICAgIG1tIDogJyVkIG1pbnV0YScsXG4gICAgaCA6ICduasOrIG9yw6snLFxuICAgIGhoIDogJyVkIG9yw6snLFxuICAgIGQgOiAnbmrDqyBkaXTDqycsXG4gICAgZGQgOiAnJWQgZGl0w6snLFxuICAgIE0gOiAnbmrDqyBtdWFqJyxcbiAgICBNTSA6ICclZCBtdWFqJyxcbiAgICB5IDogJ25qw6sgdml0JyxcbiAgICB5eSA6ICclZCB2aXRlJ1xuICB9LFxuICBkYXlPZk1vbnRoT3JkaW5hbFBhcnNlOiAvXFxkezEsMn1cXC4vLCAvLyBuZWVkIGNsYXJpZmljYXRpb25cbiAgb3JkaW5hbCA6ICclZC4nLCAvLyBuZWVkIGNsYXJpZmljYXRpb25cbiAgd2VlayA6IHtcbiAgICBkb3cgOiAxLCAvLyBNb25kYXkgaXMgdGhlIGZpcnN0IGRheSBvZiB0aGUgd2Vlay5cbiAgICBkb3kgOiA0ICAvLyBUaGUgd2VlayB0aGF0IGNvbnRhaW5zIEphbiA0dGggaXMgdGhlIGZpcnN0IHdlZWsgb2YgdGhlIHllYXIuXG4gIH1cbn07XG5cbiJdfQ==