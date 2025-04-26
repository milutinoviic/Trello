import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MagicLinkRequestComponent } from './magic-link-request.component';

describe('MagicLinkRequestComponent', () => {
  let component: MagicLinkRequestComponent;
  let fixture: ComponentFixture<MagicLinkRequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MagicLinkRequestComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MagicLinkRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
