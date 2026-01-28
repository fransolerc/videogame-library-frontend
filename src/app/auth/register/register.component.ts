import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { CommonModule } from '@angular/common';
import { RegisterRequest } from '../user.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  @Output() registerSuccess = new EventEmitter<void>();
  @Output() switchToLogin = new EventEmitter<void>();

  registerForm: FormGroup;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    return form.get('password')?.value === form.get('confirmPassword')?.value
      ? null : { 'mismatch': true };
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      return;
    }

    this.errorMessage = null;
    const { email, username, password } = this.registerForm.value;
    const request: RegisterRequest = { email, username, password };

    this.authService.register(request).subscribe({
      next: () => {
        this.registerSuccess.emit(); // Emitir evento de éxito para cerrar el modal
      },
      error: (err) => {
        this.errorMessage = 'Error en el registro. Por favor, inténtalo de nuevo.';
        if (err.error?.message) {
          this.errorMessage = err.error.message; // Mensaje de error del backend
        }
        console.error('Error de registro:', err);
      }
    });
  }

  onSwitchToLogin(): void {
    this.switchToLogin.emit();
  }
}
