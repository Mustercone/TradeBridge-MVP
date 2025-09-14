// Enhanced Form Validation System

class FormValidator {
    constructor() {
        this.rules = {
            required: (value) => value.trim() !== '',
            email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
            phone: (value) => /^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/\s/g, '')),
            minLength: (min) => (value) => value.length >= min,
            maxLength: (max) => (value) => value.length <= max,
            numeric: (value) => !isNaN(value) && !isNaN(parseFloat(value)),
            positive: (value) => parseFloat(value) > 0,
            date: (value) => !isNaN(Date.parse(value)),
            url: (value) => {
                try {
                    new URL(value);
                    return true;
                } catch {
                    return false;
                }
            }
        };
        
        this.messages = {
            required: 'This field is required',
            email: 'Please enter a valid email address',
            phone: 'Please enter a valid phone number',
            minLength: (min) => `Must be at least ${min} characters`,
            maxLength: (max) => `Must be no more than ${max} characters`,
            numeric: 'Please enter a valid number',
            positive: 'Please enter a positive number',
            date: 'Please enter a valid date',
            url: 'Please enter a valid URL'
        };
    }

    validateField(field, rules) {
        const value = field.value;
        const errors = [];

        for (const rule of rules) {
            let ruleName, ruleValue;
            
            if (typeof rule === 'string') {
                ruleName = rule;
                ruleValue = null;
            } else if (typeof rule === 'object') {
                ruleName = Object.keys(rule)[0];
                ruleValue = rule[ruleName];
            }

            const validator = this.rules[ruleName];
            if (validator) {
                const isValid = ruleValue ? validator(ruleValue)(value) : validator(value);
                if (!isValid) {
                    const message = typeof this.messages[ruleName] === 'function' 
                        ? this.messages[ruleName](ruleValue)
                        : this.messages[ruleName];
                    errors.push(message);
                }
            }
        }

        return errors;
    }

    validateForm(form, validationRules) {
        const errors = {};
        let isValid = true;

        for (const [fieldName, rules] of Object.entries(validationRules)) {
            const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
            if (field) {
                const fieldErrors = this.validateField(field, rules);
                if (fieldErrors.length > 0) {
                    errors[fieldName] = fieldErrors;
                    isValid = false;
                }
            }
        }

        return { isValid, errors };
    }

    showFieldError(field, errors) {
        this.clearFieldError(field);
        
        const errorContainer = document.createElement('div');
        errorContainer.className = 'field-error';
        errorContainer.style.cssText = `
            color: #DC2626;
            font-size: 12px;
            margin-top: 4px;
            display: flex;
            align-items: center;
            gap: 4px;
        `;
        
        errorContainer.innerHTML = `
            <span>⚠️</span>
            <span>${errors[0]}</span>
        `;
        
        field.parentNode.appendChild(errorContainer);
        field.style.borderColor = '#DC2626';
        field.style.boxShadow = '0 0 0 3px rgba(220, 38, 38, 0.1)';
    }

    clearFieldError(field) {
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        field.style.borderColor = '';
        field.style.boxShadow = '';
    }

    showFormErrors(form, errors) {
        for (const [fieldName, fieldErrors] of Object.entries(errors)) {
            const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
            if (field) {
                this.showFieldError(field, fieldErrors);
            }
        }
    }

    clearFormErrors(form) {
        const errorElements = form.querySelectorAll('.field-error');
        errorElements.forEach(error => error.remove());
        
        const fields = form.querySelectorAll('input, select, textarea');
        fields.forEach(field => {
            field.style.borderColor = '';
            field.style.boxShadow = '';
        });
    }

    // Real-time validation
    enableRealTimeValidation(form, validationRules) {
        const fields = form.querySelectorAll('input, select, textarea');
        
        fields.forEach(field => {
            const fieldName = field.name || field.id;
            const rules = validationRules[fieldName];
            
            if (rules) {
                field.addEventListener('blur', () => {
                    const errors = this.validateField(field, rules);
                    if (errors.length > 0) {
                        this.showFieldError(field, errors);
                    } else {
                        this.clearFieldError(field);
                    }
                });
                
                field.addEventListener('input', () => {
                    if (field.style.borderColor === 'rgb(220, 38, 38)') {
                        const errors = this.validateField(field, rules);
                        if (errors.length === 0) {
                            this.clearFieldError(field);
                        }
                    }
                });
            }
        });
    }
}

// Global instance
window.formValidator = new FormValidator();

// Utility functions
window.validateForm = (form, rules) => window.formValidator.validateForm(form, rules);
window.enableRealTimeValidation = (form, rules) => window.formValidator.enableRealTimeValidation(form, rules);
window.clearFormErrors = (form) => window.formValidator.clearFormErrors(form);
