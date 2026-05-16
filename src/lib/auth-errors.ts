// Tradução amigável (PT-BR) das mensagens de erro do Supabase Auth.
// Mantém o tom amigável e orienta o próximo passo, sem expor detalhes técnicos.
export function translateAuthError(msg: string | undefined | null): string {
  const m = (msg || "").toLowerCase();
  if (!m) return "Não foi possível concluir a operação. Tente novamente em instantes.";
  if (m.includes("rate limit")) return "Limite de envio atingido. Aguarde alguns instantes e tente novamente.";
  if (m.includes("invalid login credentials") || m.includes("invalid credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("user already registered") || m.includes("already registered")) return "Este e-mail já está cadastrado. Faça login ou recupere sua senha.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
  if (m.includes("password should be") || m.includes("password is too short") || m.includes("weak password")) return "Senha muito fraca. Use ao menos 6 caracteres com letras e números.";
  if (m.includes("same password") || m.includes("new password should be different")) return "A nova senha deve ser diferente da senha atual.";
  if (m.includes("invalid email")) return "E-mail inválido. Verifique e tente novamente.";
  if (m.includes("user not found")) return "Usuário não encontrado. Verifique o e-mail informado.";
  if (m.includes("token has expired") || m.includes("otp_expired") || m.includes("link is invalid") || m.includes("expired")) return "Link expirado ou inválido. Solicite um novo e-mail e tente novamente.";
  if (m.includes("network") || m.includes("failed to fetch")) return "Falha de conexão. Verifique sua internet e tente novamente.";
  if (m.includes("signup") && m.includes("disabled")) return "Cadastros temporariamente desativados. Tente novamente mais tarde.";
  if (m.includes("captcha")) return "Falha na verificação de segurança. Recarregue a página e tente novamente.";
  return "Não foi possível concluir a operação. Tente novamente em instantes.";
}
