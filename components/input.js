// components/input.js — campo de formulario base. La validación en vivo (F4) se completa en Fase 4.
// Namespace: window.Fluve.components.input
(function () {
  const { el } = window.Fluve.dom;

  /**
   * @param {{id: string, label: string, type?: string, value?: string, placeholder?: string,
   *           error?: string, required?: boolean, onInput?: Function}} props
   */
  function input({ id, label, type = 'text', value = '', placeholder = '', error = '', required = false, onInput }) {
    const control = el('input', {
      class: 'field__control',
      id,
      type,
      value,
      placeholder,
      required: required || null,
      'aria-invalid': error ? 'true' : null,
      'aria-describedby': error ? `${id}-error` : null,
      onInput,
    });

    return el('div', { class: `field${error ? ' field--error' : ''}` },
      el('label', { class: 'field__label', for: id }, label),
      control,
      el('div', { class: 'field__error', id: `${id}-error` }, error || ''),
    );
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.components = window.Fluve.components || {};
  window.Fluve.components.input = input;
})();
