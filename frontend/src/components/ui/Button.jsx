function Button({ children, href, variant = 'primary', onClick, type = 'button' }) {
  const className = `apex-button apex-button-${variant}`;

  if (href) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }

  return (
    <button className={className} onClick={onClick} type={type}>
      {children}
    </button>
  );
}

export default Button;
