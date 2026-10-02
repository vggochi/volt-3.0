
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

/* =========================================================
   VOLT — POWER YOUR GAME
   React + Supabase
========================================================= */

const FALLBACK_CATEGORIAS = [
  { id: "ps5", nome: "PlayStation 5", imagem: "" },
  { id: "ps4", nome: "PlayStation 4", imagem: "" },
  { id: "xbox", nome: "Xbox", imagem: "" },
  { id: "controles", nome: "Controles", imagem: "" },
  { id: "headsets", nome: "Headsets", imagem: "" },
  { id: "acessorios", nome: "Acessórios", imagem: "" },
];

const categoriaFallback = (produto) => {
  const texto = `${produto?.categoria || ""} ${produto?.nome || ""}`.toLowerCase();

  if (texto.includes("playstation 5") || texto.includes("ps5")) {
    return "PlayStation 5";
  }

  if (texto.includes("playstation 4") || texto.includes("ps4")) {
    return "PlayStation 4";
  }

  if (
    texto.includes("xbox") ||
    texto.includes("halo") ||
    texto.includes("forza") ||
    texto.includes("starfield")
  ) {
    return "Xbox";
  }

  if (
    texto.includes("controle") ||
    texto.includes("dualsense") ||
    texto.includes("fight stick")
  ) {
    return "Controles";
  }

  if (
    texto.includes("headset") ||
    texto.includes("hyperx") ||
    texto.includes("logitech g pro x") ||
    texto.includes("blackshark") ||
    texto.includes("arctis")
  ) {
    return "Headsets";
  }

  return "Acessórios";
};

function formatarPreco(valor) {
  const numero = Number(valor || 0);

  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data) {
  if (!data) return "Não informado";

  const partes = String(data).split("-");

  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  return data;
}

function imagemProduto(produto) {
  return (
    produto?.imagem_detalhe ||
    produto?.imagem ||
    produto?.image ||
    "https://images.unsplash.com/photo-1605901309584-818e25960a8f?auto=format&fit=crop&w=1400&q=85"
  );
}

function imagemCard(produto) {
  return (
    produto?.imagem ||
    produto?.image ||
    produto?.imagem_detalhe ||
    "https://images.unsplash.com/photo-1605901309584-818e25960a8f?auto=format&fit=crop&w=1200&q=85"
  );
}

function produtoEstoque(produto) {
  const estoque = Number(produto?.estoque);

  return Number.isFinite(estoque) ? estoque : 0;
}

function produtoAvaliacao(produto) {
  const valor = Number(produto?.avaliacao);

  return Number.isFinite(valor) && valor > 0 ? valor : 4.8;
}

/* =========================================================
   COMPONENTE PRINCIPAL
========================================================= */

export default function App() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState(FALLBACK_CATEGORIAS);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [busca, setBusca] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] =
    useState("Todas as categorias");

  const [produtoSelecionado, setProdutoSelecionado] = useState(null);

  const [favoritos, setFavoritos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);

  const [mostrarCarrinho, setMostrarCarrinho] = useState(false);
  const [mostrarFavoritos, setMostrarFavoritos] = useState(false);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState(null);

  const [salvando, setSalvando] = useState(false);

  /* =======================================================
     FORMULÁRIO
  ======================================================= */

  const formularioInicial = {
    nome: "",
    categoria_id: "",
    categoria: "",
    preco: "",
    estoque: "10",
    avaliacao: "4.8",
    imagem: "",
    imagem_detalhe: "",
    descricao: "",
    classificacao: "Livre",
    desenvolvedora: "",
    lancamento: "",
  };

  const [formulario, setFormulario] = useState(formularioInicial);

  /* =======================================================
     CARREGAR PRODUTOS
  ======================================================= */

  async function carregarProdutos() {
    setCarregando(true);
    setErro("");

    try {
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .order("id", { ascending: true });

      if (error) {
        console.error("Erro ao carregar produtos do Supabase:", error);
        setErro(error.message);
        setProdutos([]);
        return;
      }

      console.log("=================================");
      console.log("VOLT — PRODUTOS DO SUPABASE");
      console.log("Produtos carregados:", data);
      console.log("Quantidade:", data?.length || 0);
      console.log("=================================");

      setProdutos(data || []);
    } catch (err) {
      console.error("Erro inesperado:", err);
      setErro("Não foi possível carregar os produtos.");
    } finally {
      setCarregando(false);
    }
  }

  /* =======================================================
     CARREGAR CATEGORIAS
  ======================================================= */

  async function carregarCategorias() {
    try {
      const { data, error } = await supabase
        .from("categorias")
        .select("*")
        .order("id", { ascending: true });

      if (error) {
        console.warn("Não foi possível carregar categorias:", error);
        setCategorias(FALLBACK_CATEGORIAS);
        return;
      }

      console.log("VOLT — Categorias do Supabase:", data);

      if (data && data.length > 0) {
        setCategorias(data);
      }
    } catch (err) {
      console.error("Erro nas categorias:", err);
    }
  }

  useEffect(() => {
    carregarProdutos();
    carregarCategorias();
  }, []);

  /* =======================================================
     ESC
  ======================================================= */

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") {
        setProdutoSelecionado(null);
        setMostrarCarrinho(false);
        setMostrarFavoritos(false);
        setMostrarFormulario(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  /* =======================================================
     FILTRO DOS PRODUTOS
  ======================================================= */

  const produtosFiltrados = useMemo(() => {
    const texto = busca.trim().toLowerCase();

    return produtos.filter((produto) => {
      const nome = String(produto?.nome || "").toLowerCase();
      const categoria = String(
        produto?.categoria || categoriaFallback(produto)
      ).toLowerCase();

      const correspondeBusca =
        !texto ||
        nome.includes(texto) ||
        categoria.includes(texto) ||
        String(produto?.desenvolvedora || "")
          .toLowerCase()
          .includes(texto);

      const correspondeCategoria =
        categoriaSelecionada === "Todas as categorias" ||
        categoria === categoriaSelecionada.toLowerCase() ||
        categoriaFallback(produto).toLowerCase() ===
          categoriaSelecionada.toLowerCase();

      return correspondeBusca && correspondeCategoria;
    });
  }, [produtos, busca, categoriaSelecionada]);

  /* =======================================================
     FAVORITOS
  ======================================================= */

  function alternarFavorito(produto) {
    setFavoritos((anteriores) => {
      const existe = anteriores.some((item) => item.id === produto.id);

      if (existe) {
        return anteriores.filter((item) => item.id !== produto.id);
      }

      return [...anteriores, produto];
    });
  }

  function favoritoExiste(id) {
    return favoritos.some((item) => item.id === id);
  }

  /* =======================================================
     CARRINHO
  ======================================================= */

  function adicionarCarrinho(produto) {
    const estoque = produtoEstoque(produto);

    if (estoque <= 0) {
      alert("Este produto está fora de estoque.");
      return;
    }

    setCarrinho((anterior) => {
      const existente = anterior.find((item) => item.id === produto.id);

      if (existente) {
        return anterior.map((item) =>
          item.id === produto.id
            ? {
                ...item,
                quantidade: Math.min(
                  item.quantidade + 1,
                  produtoEstoque(produto)
                ),
              }
            : item
        );
      }

      return [
        ...anterior,
        {
          ...produto,
          quantidade: 1,
        },
      ];
    });
  }

  function alterarQuantidade(id, quantidade) {
    setCarrinho((anterior) =>
      anterior
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantidade: Math.max(
                  0,
                  Math.min(quantidade, produtoEstoque(item))
                ),
              }
            : item
        )
        .filter((item) => item.quantidade > 0)
    );
  }

  function removerCarrinho(id) {
    setCarrinho((anterior) => anterior.filter((item) => item.id !== id));
  }

  const totalCarrinho = carrinho.reduce(
    (total, item) => total + Number(item.preco || 0) * item.quantidade,
    0
  );

  const quantidadeCarrinho = carrinho.reduce(
    (total, item) => total + item.quantidade,
    0
  );

  /* =======================================================
     FORMULÁRIO
  ======================================================= */

  function abrirNovoProduto() {
    setProdutoEditando(null);
    setFormulario(formularioInicial);
    setMostrarFormulario(true);
  }

  function abrirEditarProduto(produto) {
    setProdutoEditando(produto);

    setFormulario({
      nome: produto?.nome || "",
      categoria_id: produto?.categoria_id ?? "",
      categoria: produto?.categoria || "",
      preco: produto?.preco ?? "",
      estoque: produto?.estoque ?? "10",
      avaliacao: produto?.avaliacao ?? "4.8",
      imagem: produto?.imagem || "",
      imagem_detalhe: produto?.imagem_detalhe || "",
      descricao: produto?.descricao || "",
      classificacao: produto?.classificacao || "Livre",
      desenvolvedora: produto?.desenvolvedora || "",
      lancamento: produto?.lancamento || "",
    });

    setMostrarFormulario(true);
  }

  function atualizarCampo(campo, valor) {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  async function salvarProduto(event) {
    event.preventDefault();

    if (!formulario.nome.trim()) {
      alert("Digite o nome do produto.");
      return;
    }

    if (!formulario.preco) {
      alert("Digite o preço do produto.");
      return;
    }

    setSalvando(true);

    try {
      const categoriaId = Number(formulario.categoria_id);
      const categoriaSelecionada = categorias.find(
        (categoria) => Number(categoria.id) === categoriaId
      );

      if (!Number.isInteger(categoriaId) || categoriaId <= 0) {
        alert("Selecione uma categoria antes de salvar o produto.");
        setSalvando(false);
        return;
      }

      const dados = {
        nome: formulario.nome.trim(),
        categoria_id: categoriaId,
        categoria: categoriaSelecionada?.nome || formulario.categoria.trim(),
        preco: Number(formulario.preco),
        estoque: Number(formulario.estoque || 0),
        avaliacao: Number(formulario.avaliacao || 4.8),
        imagem: formulario.imagem.trim(),
        imagem_detalhe: formulario.imagem_detalhe.trim(),
        descricao: formulario.descricao.trim(),
        classificacao: formulario.classificacao.trim() || "Livre",
        desenvolvedora: formulario.desenvolvedora.trim(),
        lancamento: formulario.lancamento || null,
      };

      if (produtoEditando) {
        const { data, error } = await supabase
          .from("produtos")
          .update(dados)
          .eq("id", produtoEditando.id)
          .select()
          .single();

        if (error) throw error;

        console.log("Produto atualizado:", data);

        setProdutos((anterior) =>
          anterior.map((produto) =>
            produto.id === produtoEditando.id ? data : produto
          )
        );

        if (produtoSelecionado?.id === produtoEditando.id) {
          setProdutoSelecionado(data);
        }
      } else {
        const { data, error } = await supabase
          .from("produtos")
          .insert([dados])
          .select()
          .single();

        if (error) throw error;

        console.log("Produto criado:", data);

        setProdutos((anterior) => [...anterior, data]);
      }

      setMostrarFormulario(false);
      setProdutoEditando(null);
      setFormulario(formularioInicial);
    } catch (err) {
      console.error("Erro ao salvar produto:", err);

      alert(
        `Erro ao salvar produto:\n${
          err?.message || "Erro desconhecido"
        }`
      );
    } finally {
      setSalvando(false);
    }
  }

  /* =======================================================
     DELETE
  ======================================================= */

  async function excluirProduto(produto) {
    const confirmar = window.confirm(
      `Deseja realmente excluir "${produto.nome}"?`
    );

    if (!confirmar) return;

    try {
      const { error } = await supabase
        .from("produtos")
        .delete()
        .eq("id", produto.id);

      if (error) throw error;

      console.log("Produto excluído:", produto);

      setProdutos((anterior) =>
        anterior.filter((item) => item.id !== produto.id)
      );

      if (produtoSelecionado?.id === produto.id) {
        setProdutoSelecionado(null);
      }

      setCarrinho((anterior) =>
        anterior.filter((item) => item.id !== produto.id)
      );

      setFavoritos((anterior) =>
        anterior.filter((item) => item.id !== produto.id)
      );
    } catch (err) {
      console.error("Erro ao excluir produto:", err);
      alert(`Erro ao excluir:\n${err?.message || "Erro desconhecido"}`);
    }
  }

  /* =======================================================
     ESTILOS
  ======================================================= */

  const styles = {
    app: {
      minHeight: "100vh",
      background:
        "radial-gradient(circle at 80% -10%, rgba(217,255,0,.10), transparent 28%), radial-gradient(circle at 0% 30%, rgba(217,255,0,.035), transparent 25%), #07090d",
      color: "#fff",
      fontFamily:
        "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      overflowX: "hidden",
    },

    header: {
      position: "sticky",
      top: 0,
      zIndex: 100,
      height: 76,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 5vw",
      background: "rgba(7,9,13,.84)",
      backdropFilter: "blur(18px)",
      borderBottom: "1px solid rgba(255,255,255,.07)",
    },

    logo: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      cursor: "pointer",
    },

    logoImage: {
      width: 155,
      maxWidth: "42vw",
      height: 46,
      objectFit: "contain",
      objectPosition: "left center",
      display: "block",
      cursor: "pointer",
      filter: "drop-shadow(0 0 14px rgba(217,255,0,.10))",
    },

    logoFallback: {
      alignItems: "center",
      gap: 10,
    },

    logoBox: {
      width: 36,
      height: 36,
      borderRadius: 11,
      background: "#d9ff00",
      color: "#07090d",
      display: "grid",
      placeItems: "center",
      fontWeight: 950,
      fontSize: 17,
      boxShadow: "0 0 25px rgba(217,255,0,.2)",
    },

    logoTitle: {
      fontWeight: 950,
      letterSpacing: ".08em",
      fontSize: 19,
    },

    logoSub: {
      color: "#777",
      fontSize: 9,
      letterSpacing: ".16em",
      textTransform: "uppercase",
    },

    nav: {
      display: "flex",
      gap: 28,
      alignItems: "center",
    },

    navButton: {
      border: 0,
      background: "transparent",
      color: "#aaa",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
    },

    hero: {
      position: "relative",
      minHeight: 500,
      display: "flex",
      alignItems: "center",
      padding: "80px 7vw",
      overflow: "hidden",
      background:
        "linear-gradient(90deg, rgba(7,9,13,.98) 5%, rgba(7,9,13,.82) 43%, rgba(7,9,13,.28) 100%), url('/banner-volt.jpg'), url('https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=2000&q=90')",
      backgroundSize: "cover, cover, cover",
      backgroundPosition: "center, center, center",
      backgroundRepeat: "no-repeat, no-repeat, no-repeat",
    },

    heroLogoMark: {
      position: "absolute",
      zIndex: 1,
      right: "-5vw",
      top: "50%",
      transform: "translateY(-50%)",
      width: "min(48vw, 720px)",
      opacity: .10,
      pointerEvents: "none",
      filter: "drop-shadow(0 0 45px rgba(217,255,0,.30))",
    },

    heroGlow: {
      position: "absolute",
      width: 500,
      height: 500,
      borderRadius: "50%",
      background: "rgba(217,255,0,.08)",
      filter: "blur(100px)",
      right: -180,
      top: -180,
      pointerEvents: "none",
    },

    heroContent: {
      position: "relative",
      zIndex: 2,
      maxWidth: 650,
    },

    eyebrow: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      borderRadius: 100,
      background: "rgba(217,255,0,.08)",
      border: "1px solid rgba(217,255,0,.16)",
      color: "#d9ff00",
      fontSize: 10,
      fontWeight: 900,
      letterSpacing: ".15em",
      textTransform: "uppercase",
    },

    heroTitle: {
      margin: "20px 0 14px",
      fontSize: "clamp(48px, 7vw, 92px)",
      lineHeight: .88,
      fontWeight: 1000,
      letterSpacing: "-.07em",
    },

    heroHighlight: {
      color: "#d9ff00",
      textShadow: "0 0 35px rgba(217,255,0,.16)",
    },

    heroText: {
      color: "#aaa",
      maxWidth: 590,
      lineHeight: 1.7,
      fontSize: 15,
    },

    heroButtons: {
      display: "flex",
      gap: 12,
      flexWrap: "wrap",
      marginTop: 28,
    },

    primaryButton: {
      border: 0,
      borderRadius: 12,
      background: "#d9ff00",
      color: "#07090d",
      padding: "14px 20px",
      fontWeight: 900,
      cursor: "pointer",
      boxShadow: "0 10px 30px rgba(217,255,0,.12)",
    },

    secondaryButton: {
      border: "1px solid rgba(255,255,255,.12)",
      borderRadius: 12,
      background: "rgba(255,255,255,.04)",
      color: "#fff",
      padding: "14px 20px",
      fontWeight: 800,
      cursor: "pointer",
    },

    stats: {
      display: "flex",
      gap: 35,
      marginTop: 40,
      flexWrap: "wrap",
    },

    statNumber: {
      fontSize: 25,
      fontWeight: 950,
      color: "#fff",
    },

    statLabel: {
      color: "#777",
      fontSize: 10,
      textTransform: "uppercase",
      letterSpacing: ".12em",
    },

    section: {
      padding: "65px 5vw",
      maxWidth: 1500,
      margin: "0 auto",
    },

    sectionHeader: {
      display: "flex",
      alignItems: "end",
      justifyContent: "space-between",
      gap: 20,
      marginBottom: 25,
    },

    sectionTitle: {
      margin: 0,
      fontSize: 30,
      letterSpacing: "-.04em",
    },

    sectionSubtitle: {
      color: "#777",
      fontSize: 13,
      marginTop: 7,
    },

    categories: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 13,
    },

    categoryCard: {
      position: "relative",
      height: 150,
      overflow: "hidden",
      borderRadius: 17,
      border: "1px solid rgba(255,255,255,.08)",
      background: "#0c1016",
      cursor: "pointer",
    },

    categoryImage: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
    },

    categoryOverlay: {
      position: "absolute",
      inset: 0,
      background:
        "linear-gradient(0deg, rgba(0,0,0,.88), rgba(0,0,0,.08) 75%)",
      display: "flex",
      alignItems: "end",
      padding: 17,
    },

    categoryName: {
      fontWeight: 900,
      fontSize: 14,
    },

    toolbar: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      marginBottom: 25,
    },

    search: {
      flex: "1 1 300px",
      minWidth: 230,
      padding: "14px 16px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,.09)",
      outline: "none",
      background: "#0d1118",
      color: "#fff",
      fontSize: 13,
    },

    select: {
      padding: "14px 16px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,.09)",
      outline: "none",
      background: "#0d1118",
      color: "#fff",
      fontSize: 13,
    },

    productGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      gap: 18,
    },

    productCard: {
      position: "relative",
      overflow: "hidden",
      borderRadius: 19,
      background:
        "linear-gradient(145deg, rgba(255,255,255,.055), rgba(255,255,255,.018))",
      border: "1px solid rgba(255,255,255,.075)",
      transition: "transform .25s ease, border-color .25s ease, box-shadow .25s ease",
    },

    productImageWrap: {
      height: 185,
      position: "relative",
      overflow: "hidden",
      background: "#0c1015",
    },

    productImage: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
      transition: "transform .45s ease",
    },

    heart: {
      position: "absolute",
      right: 12,
      top: 12,
      width: 38,
      height: 38,
      borderRadius: "50%",
      border: "1px solid rgba(255,255,255,.15)",
      background: "rgba(0,0,0,.6)",
      color: "#fff",
      cursor: "pointer",
      fontSize: 17,
      zIndex: 2,
    },

    productBody: {
      padding: 17,
    },

    badge: {
      display: "inline-flex",
      padding: "5px 8px",
      borderRadius: 7,
      background: "rgba(217,255,0,.09)",
      color: "#d9ff00",
      fontSize: 9,
      fontWeight: 900,
      textTransform: "uppercase",
      letterSpacing: ".08em",
    },

    productName: {
      margin: "12px 0 5px",
      fontSize: 17,
      fontWeight: 900,
      lineHeight: 1.15,
    },

    developer: {
      color: "#777",
      fontSize: 11,
      marginBottom: 12,
    },

    productBottom: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "end",
      gap: 10,
    },

    price: {
      color: "#d9ff00",
      fontSize: 20,
      fontWeight: 950,
    },

    stock: {
      fontSize: 10,
      color: "#888",
      marginTop: 4,
    },

    cardActions: {
      display: "flex",
      gap: 7,
      marginTop: 16,
    },

    smallButton: {
      flex: 1,
      padding: "10px 9px",
      borderRadius: 9,
      border: "1px solid rgba(255,255,255,.08)",
      background: "rgba(255,255,255,.035)",
      color: "#fff",
      cursor: "pointer",
      fontSize: 10,
      fontWeight: 800,
    },

    addButton: {
      flex: 1,
      padding: "10px 9px",
      borderRadius: 9,
      border: 0,
      background: "#d9ff00",
      color: "#07090d",
      cursor: "pointer",
      fontSize: 10,
      fontWeight: 900,
    },

    floatingButtons: {
      position: "fixed",
      right: 20,
      bottom: 20,
      zIndex: 200,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    },

    floatingButton: {
      width: 53,
      height: 53,
      borderRadius: 16,
      border: "1px solid rgba(217,255,0,.2)",
      background: "#10151c",
      color: "#fff",
      cursor: "pointer",
      fontSize: 18,
      boxShadow: "0 15px 40px rgba(0,0,0,.35)",
      position: "relative",
    },

    count: {
      position: "absolute",
      right: -4,
      top: -4,
      minWidth: 19,
      height: 19,
      padding: "0 5px",
      borderRadius: 20,
      display: "grid",
      placeItems: "center",
      background: "#d9ff00",
      color: "#07090d",
      fontSize: 9,
      fontWeight: 950,
    },

    overlay: {
      position: "fixed",
      inset: 0,
      zIndex: 1000,
      background: "rgba(0,0,0,.82)",
      backdropFilter: "blur(12px)",
      overflowY: "auto",
      padding: 20,
    },

    modal: {
      width: "min(100%, 1000px)",
      maxHeight: "calc(100vh - 40px)",
      overflowY: "auto",
      overflowX: "hidden",
      margin: "20px auto",
      borderRadius: 24,
      background: "#090c11",
      border: "1px solid rgba(255,255,255,.09)",
      boxShadow: "0 35px 120px rgba(0,0,0,.7)",
      animation: "voltModal .3s ease",
    },

    modalWallpaper: {
      position: "relative",
      width: "100%",
      height: 430,
      overflow: "hidden",
      background: "#080a0e",
    },

    modalWallpaperImage: {
      width: "100%",
      height: "100%",
      display: "block",
      objectFit: "cover",
      objectPosition: "center",
    },

    modalGradient: {
      position: "absolute",
      inset: 0,
      background:
        "linear-gradient(0deg, rgba(9,12,17,1), rgba(9,12,17,.03) 65%)",
    },

    closeButton: {
      position: "absolute",
      right: 18,
      top: 18,
      width: 42,
      height: 42,
      borderRadius: "50%",
      border: "1px solid rgba(255,255,255,.15)",
      background: "rgba(0,0,0,.62)",
      color: "#fff",
      cursor: "pointer",
      fontSize: 20,
      zIndex: 4,
    },

    modalContent: {
      padding: "25px 30px 35px",
    },

    modalTitle: {
      fontSize: "clamp(27px, 4vw, 45px)",
      margin: 0,
      fontWeight: 950,
      letterSpacing: "-.045em",
    },

    modalDescription: {
      color: "#999",
      lineHeight: 1.8,
      fontSize: 14,
      maxWidth: 800,
      marginTop: 15,
    },

    detailGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
      gap: 10,
      marginTop: 25,
    },

    detailBox: {
      padding: 15,
      borderRadius: 14,
      background: "rgba(255,255,255,.035)",
      border: "1px solid rgba(255,255,255,.06)",
    },

    detailLabel: {
      display: "block",
      color: "#666",
      fontSize: 9,
      fontWeight: 900,
      letterSpacing: ".1em",
      textTransform: "uppercase",
      marginBottom: 7,
    },

    detailValue: {
      color: "#fff",
      fontSize: 13,
      fontWeight: 800,
    },

    modalPriceBox: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 20,
      flexWrap: "wrap",
      marginTop: 25,
      padding: 20,
      borderRadius: 17,
      background: "rgba(217,255,0,.055)",
      border: "1px solid rgba(217,255,0,.11)",
    },

    formGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: 13,
    },

    formGroup: {
      display: "flex",
      flexDirection: "column",
      gap: 7,
    },

    formLabel: {
      color: "#999",
      fontSize: 10,
      fontWeight: 800,
    },

    input: {
      width: "100%",
      boxSizing: "border-box",
      padding: "13px 14px",
      borderRadius: 11,
      border: "1px solid rgba(255,255,255,.08)",
      background: "#0d1117",
      color: "#fff",
      outline: "none",
    },

    textarea: {
      width: "100%",
      minHeight: 110,
      resize: "vertical",
      boxSizing: "border-box",
      padding: "13px 14px",
      borderRadius: 11,
      border: "1px solid rgba(255,255,255,.08)",
      background: "#0d1117",
      color: "#fff",
      outline: "none",
    },

    cartItem: {
      display: "flex",
      gap: 13,
      padding: 13,
      borderRadius: 14,
      background: "rgba(255,255,255,.035)",
      marginBottom: 10,
    },

    cartImage: {
      width: 90,
      height: 65,
      objectFit: "cover",
      borderRadius: 9,
    },

    footer: {
      padding: "50px 5vw",
      borderTop: "1px solid rgba(255,255,255,.06)",
      color: "#555",
      textAlign: "center",
      fontSize: 11,
    },
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div style={styles.app}>
      <style>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #07090d;
        }

        button,
        input,
        textarea,
        select {
          font-family: inherit;
        }

        button {
          transition: transform .18s ease, opacity .18s ease, border-color .18s ease, background .18s ease;
        }

        button:hover {
          transform: translateY(-1px);
        }

        ::selection {
          background: #d9ff00;
          color: #07090d;
        }

        @keyframes voltModal {
          from {
            opacity: 0;
            transform: translateY(20px) scale(.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes voltFloat {
          0%, 100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-7px);
          }
        }

        @keyframes voltPulse {
          0%, 100% {
            box-shadow: 0 0 0 rgba(217,255,0,0);
          }

          50% {
            box-shadow: 0 0 35px rgba(217,255,0,.12);
          }
        }

        .volt-card:hover {
          transform: translateY(-6px);
          border-color: rgba(217,255,0,.2) !important;
          box-shadow: 0 25px 60px rgba(0,0,0,.3);
        }

        .volt-card:hover img {
          transform: scale(1.045);
        }

        .volt-category:hover {
          transform: translateY(-5px);
          border-color: rgba(217,255,0,.25) !important;
        }

        .volt-category img {
          transition: transform .5s ease;
        }

        .volt-category:hover img {
          transform: scale(1.06);
        }

        .volt-loading {
          animation: voltFloat 1.4s ease-in-out infinite;
        }

        @media (max-width: 700px) {
          .volt-nav {
            display: none !important;
          }

          .volt-form-grid {
            grid-template-columns: 1fr !important;
          }

          .volt-modal-wallpaper {
            height: 270px !important;
          }

          .volt-modal-content {
            padding: 20px !important;
          }

          .volt-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 78% 45%, rgba(217,255,0,.13), transparent 30%),
            linear-gradient(120deg, transparent 35%, rgba(217,255,0,.035), transparent 65%);
          pointer-events: none;
          animation: voltHeroPulse 5s ease-in-out infinite;
        }

        @keyframes voltHeroPulse {
          0%, 100% { opacity: .65; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.03); }
        }

        .volt-hero {
            min-height: 560px !important;
          }
        }
      `}</style>

      {/* ===================================================
          HEADER
      =================================================== */}

      <header style={styles.header}>
        <div
          style={styles.logo}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          title="VOLT — Power Your Game"
        >
          <img
            src="/logo.jpg"
            alt="VOLT — Power Your Game"
            style={styles.logoImage}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              if (e.currentTarget.nextElementSibling) {
                e.currentTarget.nextElementSibling.style.display = "flex";
              }
            }}
          />

          <div style={{ display: "none", ...styles.logoFallback }}>
            <div style={styles.logoBox}>V</div>
            <div>
              <div style={styles.logoTitle}>VOLT</div>
              <div style={styles.logoSub}>Power Your Game</div>
            </div>
          </div>
        </div>

        <nav className="volt-nav" style={styles.nav}>
          <button
            style={styles.navButton}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            Início
          </button>

          <button
            style={styles.navButton}
            onClick={() =>
              document
                .getElementById("catalogo")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Produtos
          </button>

          <button
            style={styles.navButton}
            onClick={() =>
              document
                .getElementById("catalogo")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Ofertas
          </button>
        </nav>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={styles.secondaryButton}
            onClick={() => setMostrarFavoritos(true)}
          >
            ♥ {favoritos.length}
          </button>

          <button
            style={styles.primaryButton}
            onClick={() => setMostrarCarrinho(true)}
          >
            Carrinho ({quantidadeCarrinho})
          </button>
        </div>
      </header>

      {/* ===================================================
          HERO
      =================================================== */}

      <section style={styles.hero} className="volt-hero">
        <div style={styles.heroGlow} />
        <div style={styles.heroLogoMark} aria-hidden="true">
          <img src="/logo.png" alt="" style={{ width: "100%", height: "auto", objectFit: "contain" }} />
        </div>

        <div style={styles.heroContent}>
          <span style={styles.eyebrow}>
            <span>●</span>
            Gaming Store
          </span>

          <h1 style={styles.heroTitle}>
            POWER
            <br />
            <span style={styles.heroHighlight}>YOUR GAME.</span>
          </h1>

          <p style={styles.heroText}>
            Games, consoles, controles e acessórios para quem leva o
            gameplay a sério.
          </p>

          <div style={styles.heroButtons}>
            <button
              style={styles.primaryButton}
              onClick={() =>
                document
                  .getElementById("catalogo")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Explorar produtos
            </button>

            <button
              style={styles.secondaryButton}
              onClick={() =>
                document
                  .getElementById("catalogo")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Ver catálogo
            </button>
          </div>

          <div style={styles.stats}>
            <div>
              <div style={styles.statNumber}>{produtos.length || 39}+</div>
              <div style={styles.statLabel}>produtos</div>
            </div>

            <div>
              <div style={styles.statNumber}>{categorias.length || 6}</div>
              <div style={styles.statLabel}>categorias</div>
            </div>

            <div>
              <div style={{ ...styles.statNumber, color: "#d9ff00", fontSize: 15 }}>
                ONLINE
              </div>
              <div style={styles.statLabel}>Supabase</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
          CATEGORIAS
      =================================================== */}

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>VOLT</h2>
            <div style={styles.sectionSubtitle}>Explore</div>
          </div>

          <div style={{ color: "#777", fontSize: 12 }}>
            {categorias.length} categorias
          </div>
        </div>

        <div style={styles.categories}>
          {categorias.map((categoria) => (
            <div
              className="volt-category"
              key={categoria.id}
              style={styles.categoryCard}
              onClick={() => {
                setCategoriaSelecionada(categoria.nome);
                document
                  .getElementById("catalogo")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {categoria.imagem ? (
                <img
                  src={categoria.imagem}
                  alt={categoria.nome}
                  style={styles.categoryImage}
                />
              ) : (
                <div
                  style={{
                    ...styles.categoryImage,
                    background:
                      "linear-gradient(135deg, #141a22, #080b10)",
                  }}
                />
              )}

              <div style={styles.categoryOverlay}>
                <div>
                  <div style={styles.categoryName}>{categoria.nome}</div>
                  <div
                    style={{
                      color: "#d9ff00",
                      fontSize: 9,
                      marginTop: 5,
                      fontWeight: 800,
                    }}
                  >
                    EXPLORAR →
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===================================================
          CATÁLOGO
      =================================================== */}

      <section style={styles.section} id="catalogo">
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Catálogo</h2>
            <div style={styles.sectionSubtitle}>
              Produtos
              <br />
              Dados carregados diretamente do Supabase.
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#d9ff00", fontSize: 11, fontWeight: 900 }}>
              Banco de dados conectado
            </div>
            <div style={{ color: "#666", fontSize: 10, marginTop: 4 }}>
              {produtos.length} produtos sincronizados
            </div>
          </div>
        </div>

        <div style={styles.toolbar}>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto..."
            style={styles.search}
          />

          <select
            value={categoriaSelecionada}
            onChange={(e) => setCategoriaSelecionada(e.target.value)}
            style={styles.select}
          >
            <option>Todas as categorias</option>

            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.nome}>
                {categoria.nome}
              </option>
            ))}
          </select>

          <button style={styles.primaryButton} onClick={abrirNovoProduto}>
            + Novo produto
          </button>
        </div>

        {erro && (
          <div
            style={{
              padding: 16,
              borderRadius: 13,
              marginBottom: 20,
              background: "rgba(255,60,60,.08)",
              border: "1px solid rgba(255,60,60,.18)",
              color: "#ff8585",
              fontSize: 12,
            }}
          >
            Erro ao carregar dados do Supabase: {erro}
          </div>
        )}

        {carregando ? (
          <div
            className="volt-loading"
            style={{
              padding: 80,
              textAlign: "center",
              color: "#777",
            }}
          >
            <div
              style={{
                color: "#d9ff00",
                fontWeight: 900,
                fontSize: 20,
              }}
            >
              VOLT
            </div>

            <div style={{ marginTop: 8 }}>
              Carregando produtos do Supabase...
            </div>
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <div
            style={{
              padding: 70,
              textAlign: "center",
              borderRadius: 18,
              border: "1px dashed rgba(255,255,255,.1)",
              color: "#777",
            }}
          >
            Nenhum produto encontrado.
          </div>
        ) : (
          <div style={styles.productGrid}>
            {produtosFiltrados.map((produto) => {
              const estoque = produtoEstoque(produto);
              const favorito = favoritoExiste(produto.id);

              return (
                <article
                  key={produto.id}
                  className="volt-card"
                  style={styles.productCard}
                >
                  <div style={styles.productImageWrap}>
                    <img
                      src={imagemCard(produto)}
                      alt={produto.nome}
                      style={styles.productImage}
                    />

                    <button
                      style={{
                        ...styles.heart,
                        color: favorito ? "#d9ff00" : "#fff",
                      }}
                      onClick={() => alternarFavorito(produto)}
                      title="Favoritar"
                    >
                      {favorito ? "♥" : "♡"}
                    </button>
                  </div>

                  <div style={styles.productBody}>
                    <span style={styles.badge}>
                      {produto.categoria || categoriaFallback(produto)}
                    </span>

                    <h3 style={styles.productName}>{produto.nome}</h3>

                    <div style={styles.developer}>
                      {produto.desenvolvedora || "Desenvolvedora não informada"}
                    </div>

                    <div style={styles.productBottom}>
                      <div>
                        <div style={styles.price}>
                          {formatarPreco(produto.preco)}
                        </div>

                        <div style={styles.stock}>
                          Estoque: {estoque}
                        </div>
                      </div>

                      <div
                        style={{
                          color: "#d9ff00",
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        ★ {produtoAvaliacao(produto)}
                      </div>
                    </div>

                    <div style={styles.cardActions}>
                      <button
                        style={styles.smallButton}
                        onClick={() => setProdutoSelecionado(produto)}
                      >
                        Ver detalhes
                      </button>

                      <button
                        style={{
                          ...styles.addButton,
                          opacity: estoque <= 0 ? 0.4 : 1,
                        }}
                        disabled={estoque <= 0}
                        onClick={() => adicionarCarrinho(produto)}
                      >
                        {estoque > 0 ? "Adicionar" : "Esgotado"}
                      </button>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 7,
                        marginTop: 7,
                      }}
                    >
                      <button
                        style={styles.smallButton}
                        onClick={() => abrirEditarProduto(produto)}
                      >
                        Editar
                      </button>

                      <button
                        style={{
                          ...styles.smallButton,
                          color: "#ff7070",
                        }}
                        onClick={() => excluirProduto(produto)}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ===================================================
          BOTÕES FLUTUANTES
      =================================================== */}

      <div style={styles.floatingButtons}>
        <button
          style={styles.floatingButton}
          onClick={() => setMostrarFavoritos(true)}
          title="Favoritos"
        >
          ♥
          {favoritos.length > 0 && (
            <span style={styles.count}>{favoritos.length}</span>
          )}
        </button>

        <button
          style={{
            ...styles.floatingButton,
            color: "#d9ff00",
          }}
          onClick={() => setMostrarCarrinho(true)}
          title="Carrinho"
        >
          🛒
          {quantidadeCarrinho > 0 && (
            <span style={styles.count}>{quantidadeCarrinho}</span>
          )}
        </button>
      </div>

      {/* ===================================================
          MODAL DE PRODUTO
      =================================================== */}

      {produtoSelecionado && (
        <div
          style={styles.overlay}
          onClick={() => setProdutoSelecionado(null)}
        >
          <div
            style={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="volt-modal-wallpaper"
              style={styles.modalWallpaper}
            >
              <img
                src={imagemProduto(produtoSelecionado)}
                alt={produtoSelecionado.nome}
                style={styles.modalWallpaperImage}
              />

              <div style={styles.modalGradient} />

              <button
                style={styles.closeButton}
                onClick={() => setProdutoSelecionado(null)}
              >
                ×
              </button>

              <div
                style={{
                  position: "absolute",
                  left: 30,
                  bottom: 25,
                  zIndex: 3,
                }}
              >
                <span style={styles.badge}>
                  {produtoSelecionado.categoria ||
                    categoriaFallback(produtoSelecionado)}
                </span>
              </div>
            </div>

            <div
              className="volt-modal-content"
              style={styles.modalContent}
            >
              <h2 style={styles.modalTitle}>
                {produtoSelecionado.nome}
              </h2>

              <p style={styles.modalDescription}>
                {produtoSelecionado.descricao ||
                  "Este produto faz parte do catálogo VOLT. Confira todas as informações antes de adicionar ao carrinho."}
              </p>

              <div style={styles.detailGrid}>
                <div style={styles.detailBox}>
                  <span style={styles.detailLabel}>
                    Desenvolvedora
                  </span>

                  <span style={styles.detailValue}>
                    {produtoSelecionado.desenvolvedora ||
                      "Não informado"}
                  </span>
                </div>

                <div style={styles.detailBox}>
                  <span style={styles.detailLabel}>
                    Classificação
                  </span>

                  <span style={styles.detailValue}>
                    {produtoSelecionado.classificacao ||
                      "Não informado"}
                  </span>
                </div>

                <div style={styles.detailBox}>
                  <span style={styles.detailLabel}>
                    Lançamento
                  </span>

                  <span style={styles.detailValue}>
                    {formatarData(produtoSelecionado.lancamento)}
                  </span>
                </div>

                <div style={styles.detailBox}>
                  <span style={styles.detailLabel}>
                    Avaliação
                  </span>

                  <span style={styles.detailValue}>
                    ★ {produtoAvaliacao(produtoSelecionado)}
                  </span>
                </div>

                <div style={styles.detailBox}>
                  <span style={styles.detailLabel}>
                    Estoque
                  </span>

                  <span style={styles.detailValue}>
                    {produtoEstoque(produtoSelecionado)} unidades
                  </span>
                </div>

                <div style={styles.detailBox}>
                  <span style={styles.detailLabel}>
                    Categoria
                  </span>

                  <span style={styles.detailValue}>
                    {produtoSelecionado.categoria ||
                      categoriaFallback(produtoSelecionado)}
                  </span>
                </div>
              </div>

              <div style={styles.modalPriceBox}>
                <div>
                  <div
                    style={{
                      color: "#777",
                      fontSize: 10,
                      textTransform: "uppercase",
                      fontWeight: 900,
                    }}
                  >
                    Preço
                  </div>

                  <div
                    style={{
                      color: "#d9ff00",
                      fontSize: 31,
                      fontWeight: 950,
                      marginTop: 4,
                    }}
                  >
                    {formatarPreco(produtoSelecionado.preco)}
                  </div>
                </div>

                <button
                  style={{
                    ...styles.primaryButton,
                    padding: "15px 24px",
                    opacity:
                      produtoEstoque(produtoSelecionado) > 0 ? 1 : 0.45,
                  }}
                  disabled={produtoEstoque(produtoSelecionado) <= 0}
                  onClick={() => {
                    adicionarCarrinho(produtoSelecionado);
                    setProdutoSelecionado(null);
                  }}
                >
                  {produtoEstoque(produtoSelecionado) > 0
                    ? "Adicionar ao carrinho"
                    : "Fora de estoque"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          MODAL CARRINHO
      =================================================== */}

      {mostrarCarrinho && (
        <div
          style={styles.overlay}
          onClick={() => setMostrarCarrinho(false)}
        >
          <div
            style={{
              ...styles.modal,
              maxWidth: 650,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={styles.modalContent}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 20,
                }}
              >
                <h2 style={styles.modalTitle}>Seu carrinho</h2>

                <button
                  style={styles.closeButton}
                  onClick={() => setMostrarCarrinho(false)}
                >
                  ×
                </button>
              </div>

              <div style={{ marginTop: 25 }}>
                {carrinho.length === 0 ? (
                  <div
                    style={{
                      padding: 50,
                      textAlign: "center",
                      color: "#777",
                    }}
                  >
                    Seu carrinho está vazio.
                  </div>
                ) : (
                  carrinho.map((item) => (
                    <div style={styles.cartItem} key={item.id}>
                      <img
                        src={imagemCard(item)}
                        alt={item.nome}
                        style={styles.cartImage}
                      />

                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 900,
                            fontSize: 13,
                          }}
                        >
                          {item.nome}
                        </div>

                        <div
                          style={{
                            color: "#d9ff00",
                            fontWeight: 900,
                            marginTop: 5,
                          }}
                        >
                          {formatarPreco(item.preco)}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            marginTop: 9,
                          }}
                        >
                          <button
                            style={styles.smallButton}
                            onClick={() =>
                              alterarQuantidade(
                                item.id,
                                item.quantidade - 1
                              )
                            }
                          >
                            −
                          </button>

                          <span>{item.quantidade}</span>

                          <button
                            style={styles.smallButton}
                            onClick={() =>
                              alterarQuantidade(
                                item.id,
                                item.quantidade + 1
                              )
                            }
                          >
                            +
                          </button>

                          <button
                            style={{
                              ...styles.smallButton,
                              color: "#ff7070",
                            }}
                            onClick={() => removerCarrinho(item.id)}
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {carrinho.length > 0 && (
                <div style={styles.modalPriceBox}>
                  <div>
                    <div style={{ color: "#777", fontSize: 10 }}>
                      TOTAL
                    </div>

                    <div style={styles.price}>
                      {formatarPreco(totalCarrinho)}
                    </div>
                  </div>

                  <button
                    style={styles.primaryButton}
                    onClick={() =>
                      alert(
                        "Checkout demonstrativo da VOLT. O pagamento ainda não está conectado."
                      )
                    }
                  >
                    Finalizar compra
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          MODAL FAVORITOS
      =================================================== */}

      {mostrarFavoritos && (
        <div
          style={styles.overlay}
          onClick={() => setMostrarFavoritos(false)}
        >
          <div
            style={{
              ...styles.modal,
              maxWidth: 750,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={styles.modalContent}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h2 style={styles.modalTitle}>Favoritos</h2>

                <button
                  style={styles.closeButton}
                  onClick={() => setMostrarFavoritos(false)}
                >
                  ×
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 13,
                  marginTop: 25,
                }}
              >
                {favoritos.length === 0 ? (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      textAlign: "center",
                      padding: 50,
                      color: "#777",
                    }}
                  >
                    Você ainda não possui produtos favoritos.
                  </div>
                ) : (
                  favoritos.map((produto) => (
                    <div
                      key={produto.id}
                      style={{
                        borderRadius: 15,
                        overflow: "hidden",
                        border: "1px solid rgba(255,255,255,.08)",
                        background: "rgba(255,255,255,.03)",
                      }}
                    >
                      <img
                        src={imagemCard(produto)}
                        alt={produto.nome}
                        style={{
                          width: "100%",
                          height: 130,
                          objectFit: "cover",
                        }}
                      />

                      <div style={{ padding: 14 }}>
                        <strong>{produto.nome}</strong>

                        <div
                          style={{
                            color: "#d9ff00",
                            marginTop: 7,
                            fontWeight: 900,
                          }}
                        >
                          {formatarPreco(produto.preco)}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 7,
                            marginTop: 12,
                          }}
                        >
                          <button
                            style={styles.smallButton}
                            onClick={() => {
                              setProdutoSelecionado(produto);
                              setMostrarFavoritos(false);
                            }}
                          >
                            Detalhes
                          </button>

                          <button
                            style={styles.addButton}
                            onClick={() => adicionarCarrinho(produto)}
                          >
                            Comprar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          MODAL NOVO / EDITAR
      =================================================== */}

      {mostrarFormulario && (
        <div
          style={styles.overlay}
          onClick={() => setMostrarFormulario(false)}
        >
          <div
            style={{
              ...styles.modal,
              maxWidth: 900,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={styles.modalContent}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 25,
                }}
              >
                <div>
                  <h2 style={styles.modalTitle}>
                    {produtoEditando
                      ? "Editar produto"
                      : "Novo produto"}
                  </h2>

                  <p style={{ color: "#666", fontSize: 12 }}>
                    Dados sincronizados com o Supabase.
                  </p>
                </div>

                <button
                  style={styles.closeButton}
                  onClick={() => setMostrarFormulario(false)}
                >
                  ×
                </button>
              </div>

              <form onSubmit={salvarProduto}>
                <div
                  className="volt-form-grid"
                  style={styles.formGrid}
                >
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Nome</label>
                    <input
                      style={styles.input}
                      value={formulario.nome}
                      onChange={(e) =>
                        atualizarCampo("nome", e.target.value)
                      }
                      placeholder="Nome do produto"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Categoria</label>

                    <select
                      style={styles.select}
                      value={formulario.categoria_id}
                      onChange={(e) => {
                        const id = e.target.value;
                        const categoria = categorias.find(
                          (item) => String(item.id) === String(id)
                        );
                        setFormulario((anterior) => ({
                          ...anterior,
                          categoria_id: id,
                          categoria: categoria?.nome || "",
                        }));
                      }}
                      required
                    >
                      <option value="">Selecione uma categoria</option>
                      {categorias.map((categoria) => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>
                      Preço
                    </label>

                    <input
                      style={styles.input}
                      type="number"
                      step="0.01"
                      value={formulario.preco}
                      onChange={(e) =>
                        atualizarCampo("preco", e.target.value)
                      }
                      placeholder="299.90"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>
                      Estoque
                    </label>

                    <input
                      style={styles.input}
                      type="number"
                      value={formulario.estoque}
                      onChange={(e) =>
                        atualizarCampo(
                          "estoque",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>
                      Avaliação
                    </label>

                    <input
                      style={styles.input}
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={formulario.avaliacao}
                      onChange={(e) =>
                        atualizarCampo(
                          "avaliacao",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>
                      Classificação
                    </label>

                    <select
                      style={styles.select}
                      value={formulario.classificacao}
                      onChange={(e) =>
                        atualizarCampo(
                          "classificacao",
                          e.target.value
                        )
                      }
                    >
                      <option>Livre</option>
                      <option>10 anos</option>
                      <option>12 anos</option>
                      <option>14 anos</option>
                      <option>16 anos</option>
                      <option>18 anos</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>
                      Desenvolvedora
                    </label>

                    <input
                      style={styles.input}
                      value={formulario.desenvolvedora}
                      onChange={(e) =>
                        atualizarCampo(
                          "desenvolvedora",
                          e.target.value
                        )
                      }
                      placeholder="Rockstar Games"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>
                      Lançamento
                    </label>

                    <input
                      style={styles.input}
                      type="date"
                      value={formulario.lancamento}
                      onChange={(e) =>
                        atualizarCampo(
                          "lancamento",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>
                      URL da imagem principal
                    </label>

                    <input
                      style={styles.input}
                      value={formulario.imagem}
                      onChange={(e) =>
                        atualizarCampo(
                          "imagem",
                          e.target.value
                        )
                      }
                      placeholder="https://..."
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>
                      URL da imagem de detalhe
                    </label>

                    <input
                      style={styles.input}
                      value={formulario.imagem_detalhe}
                      onChange={(e) =>
                        atualizarCampo(
                          "imagem_detalhe",
                          e.target.value
                        )
                      }
                      placeholder="https://..."
                    />
                  </div>

                  <div
                    style={{
                      ...styles.formGroup,
                      gridColumn: "1 / -1",
                    }}
                  >
                    <label style={styles.formLabel}>
                      Descrição
                    </label>

                    <textarea
                      style={styles.textarea}
                      value={formulario.descricao}
                      onChange={(e) =>
                        atualizarCampo(
                          "descricao",
                          e.target.value
                        )
                      }
                      placeholder="Descrição completa do produto..."
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                    marginTop: 25,
                  }}
                >
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => setMostrarFormulario(false)}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    style={styles.primaryButton}
                    disabled={salvando}
                  >
                    {salvando
                      ? "Salvando..."
                      : produtoEditando
                      ? "Salvar alterações"
                      : "Criar produto"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          FOOTER
      =================================================== */}

      <footer style={styles.footer}>
        <div
          style={{
            color: "#d9ff00",
            fontWeight: 950,
            fontSize: 18,
            letterSpacing: ".1em",
          }}
        >
          VOLT
        </div>

        <div style={{ marginTop: 8 }}>
          Power Your Game
        </div>

        <div style={{ marginTop: 20 }}>
          Dados sincronizados com Supabase • {produtos.length} produtos
        </div>
      </footer>
    </div>
  );
}
