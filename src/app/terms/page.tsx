import Link from "next/link";
import { getLocale } from "@/lib/i18n/server";

export const metadata = {
  title: "Termos de uso · Mulligan",
};

const LAST_UPDATED = "3 de outubro de 2026";
const CONTACT_EMAIL = "lucaskdamaceno@gmail.com";

export default async function TermsPage() {
  const locale = await getLocale();
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        {locale === "pt-BR" ? <TermsPtBr /> : <TermsEn />}
        <div className="mt-6 is-size-7 has-text-grey">
          <Link href="/privacy">Política de privacidade / Privacy</Link>
        </div>
      </div>
    </section>
  );
}

function TermsPtBr() {
  return (
    <article className="content">
      <h1>Termos de uso</h1>
      <p className="has-text-grey is-size-7">Última atualização: {LAST_UPDATED}</p>

      <p>
        Ao usar o Mulligan, você concorda com estes termos. Se não concordar, por favor não use
        o app.
      </p>

      <h2>1. Natureza do serviço</h2>
      <p>
        Mulligan é uma plataforma para jogadores de TCG anunciarem cartas e organizarem trocas
        presenciais nas suas lojinhas (LGSs). <strong>Não somos uma plataforma de pagamento</strong> —
        qualquer transação em dinheiro acontece pessoalmente entre os usuários, fora do app.
      </p>

      <h2>2. Elegibilidade</h2>
      <p>
        Você deve ter pelo menos 13 anos para usar o Mulligan. Menores de 18 anos devem usar o
        app com supervisão de um responsável.
      </p>

      <h2>3. Sua conta</h2>
      <p>
        Você é responsável por manter sua conta segura. Não compartilhe credenciais nem permita
        que outras pessoas acessem sua conta. Você pode excluir sua conta a qualquer momento
        enviando um pedido para <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>4. Conduta esperada</h2>
      <p>Ao usar o app, você concorda em:</p>
      <ul>
        <li>Fornecer informações precisas nos seus anúncios</li>
        <li>Não postar conteúdo abusivo, ilegal, discriminatório ou enganoso</li>
        <li>Respeitar os acordos de troca firmados através da plataforma</li>
        <li>Não enviar spam, não automatizar interações, não burlar medidas de segurança</li>
        <li>Não se passar por outra pessoa ou LGS</li>
      </ul>
      <p>
        Mulligan pode suspender ou excluir contas que violem estes termos, a nosso critério.
      </p>

      <h2>5. Anúncios e trocas</h2>
      <ul>
        <li>Anúncios são compromissos reais com outros jogadores da sua lojinha</li>
        <li>Preços sugeridos pela comunidade são apenas referência, não valores oficiais</li>
        <li>
          Trocas e vendas são de responsabilidade dos envolvidos. Mulligan não participa das
          transações, não garante entregas, e não media disputas presenciais
        </li>
        <li>
          Qualquer disputa deve ser resolvida diretamente com a contraparte ou com o dono da
          lojinha
        </li>
      </ul>

      <h2>6. Isenção de responsabilidade</h2>
      <p>
        O Mulligan é fornecido "no estado em que se encontra", sem garantias de qualquer tipo.
        Não garantimos que:
      </p>
      <ul>
        <li>O serviço estará sempre disponível ou livre de erros</li>
        <li>Os dados dos catálogos de cartas estejam sempre corretos ou atualizados</li>
        <li>As trocas acontecerão como combinado entre os usuários</li>
        <li>Preços sugeridos refletem o valor real de mercado das cartas</li>
      </ul>
      <p>
        Na extensão máxima permitida por lei, não nos responsabilizamos por perdas ou danos
        decorrentes do uso do serviço, incluindo trocas que não aconteçam ou cartas danificadas
        em transações presenciais.
      </p>

      <h2>7. Propriedade intelectual</h2>
      <p>
        As cartas dos jogos (Pokémon, Magic: The Gathering, Riftbound, Flesh and Blood) e suas
        imagens pertencem aos respectivos detentores de direitos (The Pokémon Company, Wizards
        of the Coast, Riot Games, Legend Story Studios). Mulligan apenas facilita a troca de
        cartas físicas entre jogadores — não vendemos cartas nem licenciamos sua propriedade
        intelectual.
      </p>
      <p>
        O código, design e identidade visual do Mulligan são de autoria própria e protegidos.
      </p>

      <h2>8. Mudanças no serviço</h2>
      <p>
        Podemos modificar, suspender ou descontinuar qualquer parte do serviço a qualquer
        momento, sem aviso prévio.
      </p>

      <h2>9. Alterações nos termos</h2>
      <p>
        Podemos atualizar estes termos. Mudanças significativas serão comunicadas. Ao continuar
        usando o app após alterações, você aceita os termos atualizados.
      </p>

      <h2>10. Lei aplicável</h2>
      <p>
        Estes termos são regidos pela legislação brasileira. Fica eleito o foro de São Paulo/SP
        para dirimir controvérsias.
      </p>

      <h2>11. Contato</h2>
      <p>
        Dúvidas: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </article>
  );
}

function TermsEn() {
  return (
    <article className="content">
      <h1>Terms of Service</h1>
      <p className="has-text-grey is-size-7">Last updated: October 3, 2026</p>

      <p>
        By using Mulligan, you agree to these terms. If you don't agree, please don't use the
        app.
      </p>

      <h2>1. What the service is</h2>
      <p>
        Mulligan is a platform for TCG players to post cards and arrange in-person trades at
        their local game stores (LGSs). <strong>We are not a payment platform</strong> — any
        cash transactions happen in person between users, outside the app.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 13 years old to use Mulligan. Users under 18 should use the app
        with parent or guardian supervision.
      </p>

      <h2>3. Your account</h2>
      <p>
        You're responsible for keeping your account secure. Don't share credentials. You can
        request account deletion at any time by emailing{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>4. Expected conduct</h2>
      <p>You agree to:</p>
      <ul>
        <li>Provide accurate information in your listings</li>
        <li>Not post abusive, illegal, discriminatory, or misleading content</li>
        <li>Honor trade agreements made through the platform</li>
        <li>Not spam, automate interactions, or circumvent security measures</li>
        <li>Not impersonate another person or LGS</li>
      </ul>
      <p>Mulligan may suspend or delete accounts that violate these terms, at our discretion.</p>

      <h2>5. Listings and trades</h2>
      <ul>
        <li>Listings are real commitments to other players at your LGS</li>
        <li>Community-suggested prices are reference only, not official valuations</li>
        <li>
          Trades and sales are the responsibility of the parties involved. Mulligan does not
          participate in transactions, does not guarantee delivery, and does not mediate in-person
          disputes
        </li>
        <li>Any dispute should be resolved directly with the counterparty or your LGS owner</li>
      </ul>

      <h2>6. Disclaimer</h2>
      <p>
        Mulligan is provided "as is", without warranties of any kind. We do not guarantee:
      </p>
      <ul>
        <li>Continuous availability or error-free operation</li>
        <li>Accuracy or timeliness of card catalog data</li>
        <li>That trades will happen as agreed between users</li>
        <li>That suggested prices reflect actual market value</li>
      </ul>
      <p>
        To the maximum extent permitted by law, we are not liable for losses or damages arising
        from use of the service, including trades that don't happen or cards damaged in person.
      </p>

      <h2>7. Intellectual property</h2>
      <p>
        Game cards (Pokémon, Magic: The Gathering, Riftbound, Flesh and Blood) and their images
        belong to their respective rights holders (The Pokémon Company, Wizards of the Coast,
        Riot Games, Legend Story Studios). Mulligan only facilitates the trade of physical cards
        between players — we don't sell cards or license their intellectual property.
      </p>
      <p>Mulligan's code, design, and visual identity are our own and are protected.</p>

      <h2>8. Changes to the service</h2>
      <p>
        We may modify, suspend, or discontinue any part of the service at any time, without
        notice.
      </p>

      <h2>9. Changes to these terms</h2>
      <p>
        We may update these terms. Significant changes will be announced. Continuing to use the
        app after changes constitutes acceptance of the updated terms.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These terms are governed by Brazilian law. The courts of São Paulo, SP, Brazil have
        exclusive jurisdiction over any disputes.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </article>
  );
}
