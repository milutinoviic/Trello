import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberAdditionComponent } from './member-addition.component';

describe('MemberAdditionComponent', () => {
  let component: MemberAdditionComponent;
  let fixture: ComponentFixture<MemberAdditionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MemberAdditionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MemberAdditionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
