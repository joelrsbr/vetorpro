import ecosystemImg from "@/assets/landing-ecosystem.png";
import vgvImg from "@/assets/landing-vgv.png";

export function LandingShowcaseSections() {
  return (
    <>
      <section className="w-full bg-white py-16 md:py-24">
        <div className="container max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Toda negociação em um único ecossistema estratégico.
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Compare bancos, acompanhe negociações e transforme simulações em inteligência comercial.
          </p>
          <img
            src={ecosystemImg}
            alt="Ecossistema VetorPro — comparativo de bancos e negociações"
            className="w-full max-w-[900px] h-auto mx-auto"
            loading="lazy"
          />
        </div>
      </section>

      <section className="w-full py-16 md:py-24" style={{ backgroundColor: "#F7F9FC" }}>
        <div className="container max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Seu VGV deixa de ser estimativa.
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            O Conceito V identifica quais propostas realmente possuem intenção de fechamento.
          </p>
          <img
            src={vgvImg}
            alt="Dashboard VetorPro — Conceito V e qualificação de propostas"
            className="w-full max-w-[900px] h-auto mx-auto"
            loading="lazy"
          />
        </div>
      </section>
    </>
  );
}
