import { Component, EventEmitter, Output, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { UiService } from '../../core/services/ui.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './register.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  public registerForm: FormGroup;
  public errorMessage: string | null = null;
  public isLoading: boolean = false;

  @Output() public switchToLogin = new EventEmitter<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    public readonly uiService: UiService
  ) {
    this.registerForm = this.fb.group({
      username: ['', { validators: [Validators.required, Validators.minLength(3)] }],
      email: ['', { validators: [Validators.required, Validators.email] }],
      password: ['', { validators: [Validators.required, Validators.minLength(6)] }],
      confirmPassword: ['', { validators: [Validators.required] }]
    }, {
      validators: [this.passwordMatchValidator]
    });
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    return password && confirmPassword && password.value === confirmPassword.value ? null : { mustMatch: true };
  }

  public onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.errorMessage = null;
    this.isLoading = true;
    const { username, email, password } = this.registerForm.value;

    this.authService.register({ username, email, password }).subscribe({
      next: () => {
        this.isLoading = false;
        this.uiService.closeRegisterModal();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Error al registrarse';
      }
    });
  }

  public onSwitchToLogin(): void {
    this.switchToLogin.emit();
  }
}
