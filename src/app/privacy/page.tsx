import Link from "next/link";
import { getLocale } from "@/lib/i18n/server";

export const metadata = {
  title: "Política de Privacidade · Mulligan",
};

const LAST_UPDATED = "3 de outubro de 2026";
const CONTACT_EMAIL = "lucaskdamaceno@gmail.com";

export default async function PrivacyPage() {
  const locale = await getLocale();
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        {locale === "pt-BR" ? <PrivacyPtBr /> : <PrivacyEn />}
        <div className="mt-6 is-size-7 has-text-grey">
          <Link href="/terms">Termos de uso / Terms</Link>
        </div>
      </div>
    </section>
  );
}

function PrivacyPtBr() {
  return (
    <article className="content">
      <h1>Política de Privacidade</h1>
      <p className="has-text-grey is-size-7">Última atualização: {LAST_UPDATED}</p>

      <p>
        Esta política explica como o <strong>Mulligan</strong> coleta, usa e protege seus dados
        quando você usa o aplicativo.
      </p>

      <h2>1. Quem somos</h2>
      <p>
        Mulligan é um app mantido por Lucas Damaceno (contato:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>), feito para ajudar jogadores de
        TCG a trocar cartas presencialmente nas suas lojinhas (LGSs). Somos o controlador dos
        seus dados pessoais nos termos da LGPD (Lei nº 13.709/2018).
      </p>

      <h2>2. Dados que coletamos</h2>
      <p>Coletamos apenas o necessário para o app funcionar:</p>
      <ul>
        <li>
          <strong>Autenticação:</strong> nome, email e foto de perfil fornecidos pelo Google ou
          Discord quando você entra pela primeira vez
        </li>
        <li>
          <strong>Perfil:</strong> nome de usuário (@handle) e preferências de jogos
        </li>
        <li>
          <strong>Lojinhas:</strong> suas participações em LGSs cadastrados
        </li>
        <li>
          <strong>Anúncios:</strong> cartas marcadas como TENHO/QUERO, preços opcionais,
          condição, notas e quantidade
        </li>
        <li>
          <strong>Trocas:</strong> histórico de trocas, mensagens trocadas na conversa de cada
          troca, confirmações de encerramento
        </li>
        <li>
          <strong>Cookies de sessão</strong> para manter você logado e lembrar o idioma escolhido
        </li>
      </ul>
      <p>
        <strong>Não coletamos</strong>: dados de pagamento (negociações em dinheiro acontecem
        pessoalmente), localização, histórico de navegação fora do app, ou dados sensíveis.
      </p>

      <h2>3. Base legal</h2>
      <p>Processamos seus dados com base em:</p>
      <ul>
        <li>
          <strong>Execução de contrato</strong> — para fornecer o serviço que você solicitou
        </li>
        <li>
          <strong>Consentimento</strong> — concedido quando você cria sua conta
        </li>
        <li>
          <strong>Legítimo interesse</strong> — segurança da plataforma e prevenção de abusos
        </li>
      </ul>

      <h2>4. Como usamos seus dados</h2>
      <ul>
        <li>Operar o app (matches, anúncios, mensagens, trocas)</li>
        <li>Mostrar seu perfil público (@handle, imagem, anúncios) para outros usuários da sua lojinha</li>
        <li>Prevenir abusos e manter a plataforma funcionando</li>
      </ul>
      <p>
        Não vendemos seus dados. Não enviamos emails de marketing. Não compartilhamos dados com
        terceiros para publicidade.
      </p>

      <h2>5. Com quem compartilhamos</h2>
      <ul>
        <li>
          <strong>Vercel</strong> — hospedagem da aplicação
        </li>
        <li>
          <strong>Neon</strong> — banco de dados (servidores em São Paulo)
        </li>
        <li>
          <strong>Google</strong> e <strong>Discord</strong> — apenas para autenticação, limitado
          ao escopo de login (perfil básico e email)
        </li>
      </ul>

      <h2>6. Seus direitos (LGPD)</h2>
      <p>Você pode a qualquer momento:</p>
      <ul>
        <li>
          <strong>Acessar</strong> os dados que armazenamos sobre você
        </li>
        <li>
          <strong>Corrigir</strong> dados incorretos ou desatualizados (via Preferências)
        </li>
        <li>
          <strong>Excluir</strong> sua conta e dados associados
        </li>
        <li>
          <strong>Exportar</strong> seus dados em formato legível (JSON)
        </li>
        <li>
          <strong>Retirar seu consentimento</strong>, o que resulta em exclusão da conta
        </li>
      </ul>
      <p>
        Para exercer qualquer direito, envie um email para{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Respondemos em até 15 dias úteis.
      </p>

      <h2>7. Retenção</h2>
      <p>
        Mantemos seus dados enquanto sua conta estiver ativa. Trocas concluídas são preservadas
        para histórico mesmo após uma das partes sair, para que a outra parte continue tendo
        acesso ao registro. Ao solicitar exclusão da conta, seus anúncios, trocas em andamento,
        mensagens e perfil são removidos; trocas já concluídas são anonimizadas.
      </p>

      <h2>8. Segurança</h2>
      <p>
        Senhas não são armazenadas — autenticação é feita pelo Google ou Discord. Todas as
        conexões usam HTTPS. O banco de dados é acessado via credenciais únicas, nunca expostas
        em código-fonte. Comentários em trocas são visíveis apenas às duas partes envolvidas.
      </p>

      <h2>9. Transferências internacionais</h2>
      <p>
        Nossos provedores (Vercel, Google, Discord) podem armazenar dados em servidores fora do
        Brasil. Essas transferências cumprem salvaguardas apropriadas conforme a LGPD. O banco de
        dados principal (Neon) fica em São Paulo.
      </p>

      <h2>10. Menores de idade</h2>
      <p>
        O Mulligan é destinado a maiores de 13 anos. Usuários entre 13 e 18 anos devem ter
        supervisão de um responsável legal.
      </p>

      <h2>11. Mudanças nesta política</h2>
      <p>
        Podemos atualizar esta política. Mudanças significativas serão comunicadas na página e,
        quando aplicável, por email.
      </p>

      <h2>12. Contato</h2>
      <p>
        Dúvidas ou pedidos sobre seus dados: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </article>
  );
}

function PrivacyEn() {
  return (
    <article className="content">
      <h1>Privacy Policy</h1>
      <p className="has-text-grey is-size-7">Last updated: October 3, 2026</p>

      <p>
        This policy explains how <strong>Mulligan</strong> collects, uses, and protects your
        data when you use the app.
      </p>

      <h2>1. Who we are</h2>
      <p>
        Mulligan is operated by Lucas Damaceno (contact:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>) to help TCG players trade cards
        in person at their local game stores (LGSs). We are the data controller under Brazil's
        LGPD (Law nº 13.709/2018).
      </p>

      <h2>2. Data we collect</h2>
      <p>Only what the app needs to function:</p>
      <ul>
        <li>
          <strong>Authentication:</strong> name, email, and profile picture provided by Google or
          Discord at sign-in
        </li>
        <li>
          <strong>Profile:</strong> your handle (@username) and game preferences
        </li>
        <li>
          <strong>LGSs:</strong> which stores you're a member of
        </li>
        <li>
          <strong>Listings:</strong> cards marked HAVE/WANT, optional prices, condition, notes,
          and quantities
        </li>
        <li>
          <strong>Trades:</strong> trade history, comments on each trade, confirmation records
        </li>
        <li>
          <strong>Session cookies</strong> to keep you signed in and remember your language
        </li>
      </ul>
      <p>
        <strong>We do not collect</strong> payment data (cash settles in person), location,
        browsing history outside the app, or any sensitive personal data.
      </p>

      <h2>3. Legal basis</h2>
      <ul>
        <li>
          <strong>Contract performance</strong> — to provide the service you requested
        </li>
        <li>
          <strong>Consent</strong> — given when you create your account
        </li>
        <li>
          <strong>Legitimate interest</strong> — platform safety and abuse prevention
        </li>
      </ul>

      <h2>4. How we use data</h2>
      <ul>
        <li>Running the app (matches, listings, messages, trades)</li>
        <li>Showing your public profile (@handle, image, listings) to other users at your LGS</li>
        <li>Preventing abuse and keeping the platform functional</li>
      </ul>
      <p>
        We do not sell your data. We do not send marketing emails. We do not share data with
        third parties for advertising.
      </p>

      <h2>5. Who we share with</h2>
      <ul>
        <li>
          <strong>Vercel</strong> — application hosting
        </li>
        <li>
          <strong>Neon</strong> — database (São Paulo region)
        </li>
        <li>
          <strong>Google</strong> and <strong>Discord</strong> — authentication only, limited to
          basic profile and email scope
        </li>
      </ul>

      <h2>6. Your rights (LGPD)</h2>
      <p>At any time you may:</p>
      <ul>
        <li>
          <strong>Access</strong> the data we store about you
        </li>
        <li>
          <strong>Correct</strong> incorrect or outdated data (via Preferences)
        </li>
        <li>
          <strong>Delete</strong> your account and associated data
        </li>
        <li>
          <strong>Export</strong> your data in a readable format (JSON)
        </li>
        <li>
          <strong>Withdraw consent</strong>, which results in account deletion
        </li>
      </ul>
      <p>
        To exercise any right, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We
        respond within 15 business days.
      </p>

      <h2>7. Data retention</h2>
      <p>
        We retain your data while your account is active. Finished trades are preserved for
        history even after one party leaves, so the counterparty keeps their record. When you
        request account deletion, your listings, in-progress trades, messages, and profile are
        removed; finished trades are anonymized.
      </p>

      <h2>8. Security</h2>
      <p>
        Passwords aren't stored — authentication is handled by Google or Discord. All connections
        use HTTPS. The database is accessed with unique credentials never exposed in source code.
        Trade comments are visible only to the two participants.
      </p>

      <h2>9. International transfers</h2>
      <p>
        Our providers (Vercel, Google, Discord) may store data on servers outside Brazil. These
        transfers follow appropriate LGPD safeguards. The primary database (Neon) is in São
        Paulo.
      </p>

      <h2>10. Minors</h2>
      <p>
        Mulligan is for users 13 and over. Users between 13 and 18 should use the app with
        parent or guardian supervision.
      </p>

      <h2>11. Changes to this policy</h2>
      <p>
        We may update this policy. Significant changes will be posted on this page and, when
        applicable, communicated by email.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions or data requests: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </article>
  );
}
