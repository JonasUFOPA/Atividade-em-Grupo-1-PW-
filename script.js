'use strict'

const URL_API = 'https://fakestoreapi.com/products'
const CHAVE_FAVORITOS = 'vitrine_favoritos'

let produtos = []
let favoritos = []
let mostrandoFavoritos = false
let termoPesquisa = ''
let produtoSelecionado = null

const campoPesquisa = document.getElementById('campo-pesquisa')
const formPesquisa = document.getElementById('form-pesquisa')
const listaProdutos = document.getElementById('lista-produtos')
const mensagemStatus = document.getElementById('mensagem-status')
const mensagemVazia = document.getElementById('mensagem-vazia')
const areaErro = document.getElementById('area-erro')
const textoErro = document.getElementById('texto-erro')
const textoQuantidade = document.getElementById('texto-quantidade')
const tituloLista = document.getElementById('titulo-lista')
const contadorFavoritos = document.getElementById('contador-favoritos')
const modalDetalhes = document.getElementById('modal-detalhes')
const conteudoModal = document.getElementById('conteudo-modal')
const notificacao = document.getElementById('notificacao')

const botaoTodos = document.getElementById('botao-todos')
const botaoFavoritos = document.getElementById('botao-favoritos')
const botaoListaFavoritos = document.getElementById('botao-lista-favoritos')
const botaoTentarNovamente = document.getElementById('botao-tentar-novamente')
const botaoFecharModal = document.getElementById('botao-fechar-modal')

function formatarPreco(preco) {
  return Number(preco).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'USD'
  })
}

function mostrarNotificacao(mensagem) {
  notificacao.textContent = mensagem
  notificacao.hidden = false

  setTimeout(function () {
    notificacao.hidden = true
  }, 2500)
}

function mostrarStatus(mensagem) {
  mensagemStatus.textContent = mensagem
  mensagemStatus.hidden = false
}

function esconderMensagens() {
  mensagemStatus.hidden = true
  mensagemVazia.hidden = true
  areaErro.hidden = true
}

function carregarFavoritos() {
  try {
    const dadosSalvos = localStorage.getItem(CHAVE_FAVORITOS)

    if (dadosSalvos === null) {
      favoritos = []
      return
    }

    const dadosConvertidos = JSON.parse(dadosSalvos)

    if (!Array.isArray(dadosConvertidos)) {
      throw new Error('Os favoritos salvos não possuem um formato válido.')
    }

    favoritos = dadosConvertidos
      .filter(function (produto) {
        return (
          produto !== null &&
          typeof produto === 'object' &&
          Number.isInteger(Number(produto.id)) &&
          Number.isFinite(Number(produto.price)) &&
          typeof produto.title === 'string' &&
          typeof produto.image === 'string'
        )
      })
      .map(function (produto) {
        return {
          id: Number(produto.id),
          title: produto.title,
          price: Number(produto.price),
          image: produto.image,
          category: produto.category || '',
          description: produto.description || '',
          rating: produto.rating || {
            rate: 0,
            count: 0
          }
        }
      })
  } catch (erro) {
    console.error('Erro ao recuperar favoritos:', erro)
    favoritos = []
    mostrarNotificacao('Não foi possível recuperar os favoritos salvos.')
  }
}

function salvarFavoritos() {
  try {
    const dadosJSON = JSON.stringify(favoritos)

    localStorage.setItem(CHAVE_FAVORITOS, dadosJSON)
    atualizarContadorFavoritos()

    return true
  } catch (erro) {
    console.error('Erro ao salvar favoritos:', erro)
    mostrarNotificacao(
      'Não foi possível salvar. Verifique o armazenamento do navegador.'
    )

    return false
  }
}

async function carregarProdutos() {
  esconderMensagens()

  listaProdutos.replaceChildren()
  textoQuantidade.textContent = 'Aguarde um instante...'

  mostrarStatus('Carregando produtos da API...')

  botaoTentarNovamente.disabled = true

  try {
    const resposta = await fetch(URL_API, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    })

    if (!resposta.ok) {
      throw new Error('Erro HTTP ' + resposta.status)
    }

    const dados = await resposta.json()

    if (!Array.isArray(dados)) {
      throw new Error('A API retornou dados em formato inesperado.')
    }

    produtos = dados.filter(function (produto) {
      return (
        produto &&
        Number.isInteger(Number(produto.id)) &&
        typeof produto.title === 'string' &&
        typeof produto.image === 'string' &&
        Number.isFinite(Number(produto.price))
      )
    })

    if (produtos.length === 0) {
      throw new Error('A API não retornou produtos válidos.')
    }

    esconderMensagens()

    renderizarProdutos()

    mostrarNotificacao('Catálogo carregado com sucesso!')
  } catch (erro) {
    console.error('Falha ao carregar produtos:', erro)

    listaProdutos.replaceChildren()
    mensagemVazia.hidden = true
    mensagemStatus.hidden = true

    areaErro.hidden = false

    textoErro.textContent =
      'Não foi possível acessar a API. Verifique sua internet ' +
      'e tente novamente. Detalhes: ' +
      erro.message

    textoQuantidade.textContent = 'Catálogo indisponível'
  } finally {
    botaoTentarNovamente.disabled = false
  }
}

function obterProdutosExibidos() {
  let resultado

  if (mostrandoFavoritos) {
    resultado = favoritos
  } else {
    resultado = produtos
  }

  const termo = termoPesquisa.trim().toLocaleLowerCase('pt-BR')

  if (termo !== '') {
    resultado = resultado.filter(function (produto) {
      return produto.title.toLocaleLowerCase('pt-BR').includes(termo)
    })
  }

  return resultado
}

function renderizarProdutos() {
  esconderMensagens()

  listaProdutos.replaceChildren()

  const resultado = obterProdutosExibidos()

  tituloLista.textContent = mostrandoFavoritos
    ? 'Meus favoritos'
    : 'Todos os produtos'

  textoQuantidade.textContent =
    resultado.length +
    (resultado.length === 1 ? ' produto encontrado' : ' produtos encontrados')

  atualizarAbas()

  if (resultado.length === 0) {
    mensagemVazia.hidden = false
    listaProdutos.hidden = true

    if (mostrandoFavoritos && favoritos.length === 0) {
      mensagemVazia.querySelector('h3').textContent = 'Sua lista está vazia'

      mensagemVazia.querySelector('p').textContent =
        'Clique no coração de um produto para adicioná-lo aos favoritos.'
    } else {
      mensagemVazia.querySelector('h3').textContent =
        'Nenhum produto encontrado'

      mensagemVazia.querySelector('p').textContent =
        'Tente outro termo de pesquisa.'
    }

    return
  }

  listaProdutos.hidden = false

  resultado.forEach(function (produto) {
    const cartao = criarCartaoProduto(produto)
    listaProdutos.appendChild(cartao)
  })
}

function criarCartaoProduto(produto) {
  const cartao = document.createElement('article')
  cartao.className = 'cartao-produto'

  const areaImagem = document.createElement('div')
  areaImagem.className = 'area-imagem'

  const imagem = document.createElement('img')
  imagem.className = 'imagem-produto'
  imagem.src = produto.image
  imagem.alt = 'Imagem do produto ' + produto.title
  imagem.loading = 'lazy'

  imagem.addEventListener('error', function () {
    imagem.alt = 'Imagem indisponível para ' + produto.title
    imagem.removeAttribute('src')
  })

  const botaoCoracao = document.createElement('button')
  botaoCoracao.type = 'button'
  botaoCoracao.className = 'botao-coracao'

  const estaFavoritado = verificarFavorito(produto.id)

  botaoCoracao.textContent = estaFavoritado ? '♥' : '♡'
  botaoCoracao.classList.toggle('favoritado', estaFavoritado)
  botaoCoracao.setAttribute('aria-pressed', String(estaFavoritado))
  botaoCoracao.setAttribute(
    'aria-label',
    estaFavoritado
      ? 'Remover ' + produto.title + ' dos favoritos'
      : 'Adicionar ' + produto.title + ' aos favoritos'
  )

  botaoCoracao.addEventListener('click', function () {
    alternarFavorito(produto)
  })

  areaImagem.append(imagem, botaoCoracao)

  const conteudo = document.createElement('div')
  conteudo.className = 'conteudo-cartao'

  const categoria = document.createElement('p')
  categoria.className = 'categoria'
  categoria.textContent = produto.category || 'Sem categoria'

  const nome = document.createElement('h3')
  nome.className = 'nome-produto'
  nome.textContent = produto.title

  const preco = document.createElement('p')
  preco.className = 'preco'
  preco.textContent = formatarPreco(produto.price)

  const botaoDetalhes = document.createElement('button')
  botaoDetalhes.type = 'button'
  botaoDetalhes.className = 'botao-detalhes'
  botaoDetalhes.textContent = 'Ver detalhes'

  botaoDetalhes.addEventListener('click', function () {
    abrirDetalhes(produto)
  })

  conteudo.append(categoria, nome, preco, botaoDetalhes)
  cartao.append(areaImagem, conteudo)

  return cartao
}

function verificarFavorito(id) {
  return favoritos.some(function (produto) {
    return Number(produto.id) === Number(id)
  })
}

function alternarFavorito(produto) {
  const indice = favoritos.findIndex(function (favorito) {
    return Number(favorito.id) === Number(produto.id)
  })

  if (indice !== -1) {
    const removido = favoritos.splice(indice, 1)[0]

    if (!salvarFavoritos()) {
      favoritos.splice(indice, 0, removido)
      return
    }

    mostrarNotificacao('Produto removido dos favoritos.')
  } else {
    const novoFavorito = {
      id: Number(produto.id),
      title: produto.title,
      price: Number(produto.price),
      image: produto.image,
      category: produto.category || '',
      description: produto.description || '',
      rating: produto.rating || {
        rate: 0,
        count: 0
      }
    }

    favoritos.push(novoFavorito)

    if (!salvarFavoritos()) {
      favoritos.pop()
      return
    }

    mostrarNotificacao('Produto adicionado aos favoritos.')
  }

  renderizarProdutos()

  if (produtoSelecionado !== null) {
    atualizarBotaoFavoritoModal()
  }
}

function atualizarContadorFavoritos() {
  contadorFavoritos.textContent = favoritos.length
}

function abrirDetalhes(produto) {
  produtoSelecionado = produto
  conteudoModal.replaceChildren()

  const grade = document.createElement('div')
  grade.className = 'detalhes-grade'

  const imagem = document.createElement('img')
  imagem.src = produto.image
  imagem.alt = 'Imagem do produto ' + produto.title

  imagem.addEventListener('error', function () {
    imagem.alt = 'Imagem indisponível'
    imagem.removeAttribute('src')
  })

  const informacoes = document.createElement('div')

  const categoria = document.createElement('p')
  categoria.className = 'categoria'
  categoria.textContent = produto.category || 'Sem categoria'

  const titulo = document.createElement('h2')
  titulo.textContent = produto.title

  const descricao = document.createElement('p')
  descricao.className = 'detalhes-descricao'
  descricao.textContent = produto.description || 'Nenhuma descrição disponível.'

  const preco = document.createElement('p')
  preco.className = 'detalhes-preco'
  preco.textContent = formatarPreco(produto.price)

  const avaliacao = document.createElement('p')
  avaliacao.className = 'detalhes-avaliacao'

  const nota =
    produto.rating && Number.isFinite(Number(produto.rating.rate))
      ? Number(produto.rating.rate)
      : 0

  const quantidade =
    produto.rating && Number.isFinite(Number(produto.rating.count))
      ? Number(produto.rating.count)
      : 0

  avaliacao.textContent =
    '★ ' + nota.toFixed(1) + ' de 5 (' + quantidade + ' avaliações)'

  const botaoFavorito = document.createElement('button')
  botaoFavorito.type = 'button'
  botaoFavorito.className = 'botao-favorito-modal'
  botaoFavorito.id = 'botao-favorito-modal'

  botaoFavorito.addEventListener('click', function () {
    alternarFavorito(produto)
  })

  informacoes.append(
    categoria,
    titulo,
    descricao,
    preco,
    avaliacao,
    botaoFavorito
  )

  grade.append(imagem, informacoes)
  conteudoModal.appendChild(grade)

  atualizarBotaoFavoritoModal()

  if (!modalDetalhes.open) {
    modalDetalhes.showModal()
  }
}

function atualizarBotaoFavoritoModal() {
  const botao = document.getElementById('botao-favorito-modal')

  if (!botao || produtoSelecionado === null) {
    return
  }

  const estaFavoritado = verificarFavorito(produtoSelecionado.id)

  botao.textContent = estaFavoritado
    ? '♥ Remover dos favoritos'
    : '♡ Adicionar aos favoritos'
}

function atualizarAbas() {
  botaoTodos.classList.toggle('ativa', !mostrandoFavoritos)
  botaoListaFavoritos.classList.toggle('ativa', mostrandoFavoritos)

  botaoTodos.setAttribute('aria-pressed', String(!mostrandoFavoritos))
  botaoListaFavoritos.setAttribute('aria-pressed', String(mostrandoFavoritos))
}

formPesquisa.addEventListener('submit', function (evento) {
  evento.preventDefault()

  termoPesquisa = campoPesquisa.value
  renderizarProdutos()
})

campoPesquisa.addEventListener('input', function () {
  termoPesquisa = campoPesquisa.value
  renderizarProdutos()
})

botaoTodos.addEventListener('click', function () {
  mostrandoFavoritos = false
  renderizarProdutos()
})

function abrirListaFavoritos() {
  mostrandoFavoritos = true
  renderizarProdutos()
}

botaoFavoritos.addEventListener('click', abrirListaFavoritos)
botaoListaFavoritos.addEventListener('click', abrirListaFavoritos)

botaoTentarNovamente.addEventListener('click', function () {
  carregarProdutos()
})

botaoFecharModal.addEventListener('click', function () {
  modalDetalhes.close()
})

modalDetalhes.addEventListener('close', function () {
  produtoSelecionado = null
})

document
  .getElementById('link-inicio')
  .addEventListener('click', function (evento) {
    evento.preventDefault()

    mostrandoFavoritos = false
    termoPesquisa = ''
    campoPesquisa.value = ''

    renderizarProdutos()
  })

function iniciarAplicacao() {
  carregarFavoritos()
  atualizarContadorFavoritos()
  carregarProdutos()
}

iniciarAplicacao()
