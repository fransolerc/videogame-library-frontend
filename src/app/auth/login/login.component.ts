import { Component, EventEmitter, Output, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { UiService } from '../../core/services/ui.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  public loginForm: FormGroup;
  public errorMessage: string | null = null;
  public isLoading: boolean = false;

  @Output() public switchToRegister = new EventEmitter<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    public readonly uiService: UiService
  ) {
    this.loginForm = this.fb.group({
      email: ['', { validators: [Validators.required, Validators.email] }],
      password: ['', { validators: [Validators.required] }]
    });
  }

  public onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.errorMessage = null;
    this.isLoading = true;
    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: () => {
        this.isLoading = false;
        this.uiService.closeLoginModal();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Error al iniciar sesión';
      }
    });
  }

  public onSwitchToRegister(): void {
    this.switchToRegister.emit();
  }
}
