import { TestBed } from '@angular/core/testing';

import { FormToggleService } from './form-toggle.service';

describe('FormToggleService', () => {
  let service: FormToggleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FormToggleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
