export type Moeda = 'AOA' | 'USDT';

const NBSP = '\u00A0';

// Formata uma string decimal da API ("1250.5") em pt-AO ("1 250,50").
// Trabalha só com texto: nunca passa por float, nunca arredonda.
export function formatValor(valor: string, moeda?: Moeda): string {
  const neg = valor.startsWith('-');
  const [rawInt = '0', rawDec = ''] = (neg ? valor.slice(1) : valor).split('.');
  const int = rawInt.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  const dec = rawDec.replace(/0+$/, '').padEnd(2, '0');
  const texto = `${neg ? '-' : ''}${int},${dec}`;
  return moeda ? `${texto}${NBSP}${moeda}` : texto;
}

// Converte o que o utilizador escreve ("1 250,50", "1250.5") em string decimal da API ("1250.50").
// Vírgula = separador decimal (pontos são milhares). Sem vírgula, um único ponto é decimal.
// Devolve null se inválido.
export function parseValor(input: string, maxDecimais = 8): string | null {
  let s = input.replace(/[\s\u00A0\u202F]/g, '');
  if (!s) return null;
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if ((s.match(/\./g) ?? []).length > 1) {
    s = s.replace(/\./g, '');
  }
  const re = new RegExp(`^\\d{1,12}(\\.\\d{1,${maxDecimais}})?$`);
  if (!re.test(s)) return null;
  return s.replace(/^0+(?=\d)/, '');
}
