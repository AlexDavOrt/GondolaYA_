/** Campo de formulario (usa las clases contact__field... de estilo.css). */
export default function Campo({ id, label, error, como = 'input', ...props }) {
  const Control = como;
  return (
    <div className={'contact__field' + (error ? ' contact__field--error' : '')}>
      <label className="contact__label" htmlFor={id}>{label}</label>
      <Control
        className="contact__input"
        id={id}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      <span className="contact__error" id={`${id}-error`} role={error ? 'alert' : undefined}>{error}</span>
    </div>
  );
}
