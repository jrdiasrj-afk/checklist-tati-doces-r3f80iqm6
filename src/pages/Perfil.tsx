import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MainLayout } from '@/components/MainLayout'
import { useAuth } from '@/contexts/AuthContext'
import { usersService } from '@/services/users'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import {
  User,
  Mail,
  Lock,
  LogOut,
  Smartphone,
  Upload,
  CheckCircle2,
  Share,
  PlusSquare,
} from 'lucide-react'

export default function Perfil() {
  const { user, refreshUser, logout } = useAuth()
  const navigate = useNavigate()

  // Estados Perfil
  const [nome, setNome] = useState(user?.name || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [savingPerfil, setSavingPerfil] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estados Trocar E-mail
  const [novoEmail, setNovoEmail] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // Estados Trocar Senha
  const [senhaAntiga, setSenhaAntiga] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')
  const [savingSenha, setSavingSenha] = useState(false)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleSavePerfil = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSavingPerfil(true)
    try {
      await usersService.updateProfile(user.id, {
        name: nome.trim(),
        avatarFile,
      })
      await refreshUser()
      toast.success('Perfil atualizado com sucesso! 🧁')
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Erro ao atualizar perfil.')
    } finally {
      setSavingPerfil(false)
    }
  }

  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoEmail.trim()) return

    setSavingEmail(true)
    try {
      await pb.collection('users').requestEmailChange(novoEmail.trim())
      setEmailSent(true)
      toast.success('Link de confirmação enviado para o novo e-mail!')
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Erro ao solicitar troca de e-mail.')
    } finally {
      setSavingEmail(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (novaSenha !== confirmaSenha) {
      toast.error('A nova senha e a confirmação não conferem.')
      return
    }
    if (novaSenha.length < 8) {
      toast.error('A nova senha deve ter no mínimo 8 caracteres.')
      return
    }

    setSavingSenha(true)
    try {
      await pb.collection('users').update(user.id, {
        oldPassword: senhaAntiga,
        password: novaSenha,
        passwordConfirm: confirmaSenha,
      })
      toast.success('Senha atualizada com sucesso!')
      setSenhaAntiga('')
      setNovaSenha('')
      setConfirmaSenha('')
    } catch (err: any) {
      toast.error(
        err?.data?.message || err?.message || 'Senha atual incorreta ou erro no servidor.',
      )
    } finally {
      setSavingSenha(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const currentAvatarUrl = avatarPreview
    ? avatarPreview
    : user?.avatar
      ? usersService.getFileUrl(user, user.avatar)
      : ''

  return (
    <MainLayout>
      <div className="max-w-xl mx-auto space-y-6">
        {/* ================= CARTÃO DO PERFIL ================= */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F2A65A]/20 shadow-xs">
          <div className="flex items-center gap-2 pb-4 border-b border-[#F2A65A]/15 mb-6">
            <User className="w-5 h-5 text-[#E0447C]" />
            <h2 className="font-display font-bold text-xl text-[#3B2B2B]">Meu Perfil</h2>
          </div>

          <form onSubmit={handleSavePerfil} className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 border-2 border-[#E0447C]/40 shadow-sm">
                <AvatarImage src={currentAvatarUrl} />
                <AvatarFallback className="bg-[#E0447C]/10 text-[#E0447C] font-bold text-lg">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'TC'}
                </AvatarFallback>
              </Avatar>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full border-[#F2A65A]/40 text-xs font-semibold hover:bg-[#FFF3E8]"
                >
                  <Upload className="w-3.5 h-3.5 mr-1 text-[#E0447C]" /> Trocar Foto
                </Button>
                <p className="text-[10px] text-[#8A6F6F] mt-1">Recomendado JPG ou PNG quadrado</p>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]">
                Nome Completo
              </Label>
              <Input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="h-11 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 focus-visible:ring-[#E0447C] text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-[#3B2B2B]">
                Função no Tati Check
              </Label>
              <Input
                type="text"
                disabled
                value={user?.role?.toUpperCase() || ''}
                className="h-11 rounded-xl bg-stone-100 border-stone-200 text-stone-600 text-sm font-bold cursor-not-allowed"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                disabled={savingPerfil}
                className="rounded-full bg-[#E0447C] hover:bg-[#C23066] text-white font-bold text-xs px-6"
              >
                {savingPerfil ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </div>

        {/* ================= INSTALAR O APP (PWA) ================= */}
        <div className="bg-gradient-to-br from-[#FFF3E8] to-[#FFF9F2] rounded-3xl p-6 sm:p-8 border border-[#F2A65A]/30 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <span className="p-2 rounded-xl bg-[#E0447C] text-white">
              <Smartphone className="w-5 h-5" />
            </span>
            <h3 className="font-display font-bold text-lg text-[#3B2B2B]">
              Instalar o App no Celular
            </h3>
          </div>
          <p className="text-xs text-[#8A6F6F] leading-relaxed mb-4">
            Tenha o Tati Check direto na tela inicial do seu celular como um app nativo, rápido e
            sem precisar de loja de aplicativos:
          </p>

          <div className="space-y-2.5 text-xs text-[#3B2B2B] bg-white/70 p-4 rounded-2xl border border-[#F2A65A]/20">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#E0447C] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <span>
                Toque no botão de <strong>Compartilhar</strong> (iOS Safari) ou no{' '}
                <strong>menu de 3 pontos</strong> (Android Chrome).
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#E0447C] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <span>
                Selecione a opção <strong>"Adicionar à Tela de Início"</strong>.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#E0447C] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                3
              </span>
              <span>Confirme e pronto! O ícone com o docinho da Tati aparecerá na sua tela.</span>
            </div>
          </div>
        </div>

        {/* ================= TROCAR E-MAIL ================= */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F2A65A]/20 shadow-xs">
          <div className="flex items-center gap-2 pb-4 border-b border-[#F2A65A]/15 mb-4">
            <Mail className="w-5 h-5 text-[#E0447C]" />
            <h3 className="font-display font-bold text-lg text-[#3B2B2B]">Trocar E-mail</h3>
          </div>

          {emailSent ? (
            <div className="p-4 rounded-2xl bg-[#3FA372]/15 border border-[#3FA372]/30 text-xs text-[#2D7A51]">
              <p className="font-bold">E-mail de confirmação enviado!</p>
              <p className="mt-1">
                Acesse o endereço <strong>{novoEmail}</strong> e clique no link de confirmação para
                concluir a troca.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRequestEmailChange} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#3B2B2B]">E-mail Atual</Label>
                <Input
                  disabled
                  value={user?.email || ''}
                  className="h-10 rounded-xl bg-stone-100 text-stone-600 text-xs font-semibold cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#3B2B2B]">Novo E-mail</Label>
                <Input
                  type="email"
                  required
                  placeholder="novo.email@tatidoces.com.br"
                  value={novoEmail}
                  onChange={(e) => setNovoEmail(e.target.value)}
                  className="h-10 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={savingEmail}
                  variant="outline"
                  className="rounded-full border-[#E0447C] text-[#E0447C] hover:bg-[#FFF3E8] text-xs font-bold"
                >
                  {savingEmail ? 'Enviando...' : 'Solicitar Troca de E-mail'}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* ================= ALTERAR SENHA ================= */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F2A65A]/20 shadow-xs">
          <div className="flex items-center gap-2 pb-4 border-b border-[#F2A65A]/15 mb-4">
            <Lock className="w-5 h-5 text-[#E0447C]" />
            <h3 className="font-display font-bold text-lg text-[#3B2B2B]">Alterar Senha</h3>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#3B2B2B]">Senha Atual</Label>
              <Input
                type="password"
                required
                value={senhaAntiga}
                onChange={(e) => setSenhaAntiga(e.target.value)}
                className="h-10 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#3B2B2B]">
                Nova Senha (mín. 8 caracteres)
              </Label>
              <Input
                type="password"
                required
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="h-10 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#3B2B2B]">Confirme a Nova Senha</Label>
              <Input
                type="password"
                required
                value={confirmaSenha}
                onChange={(e) => setConfirmaSenha(e.target.value)}
                className="h-10 rounded-xl bg-[#FFF9F2]/60 border-[#F2A65A]/30 text-xs"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                disabled={savingSenha}
                variant="outline"
                className="rounded-full border-stone-300 text-[#3B2B2B] hover:bg-stone-50 text-xs font-bold"
              >
                {savingSenha ? 'Atualizando...' : 'Atualizar Senha'}
              </Button>
            </div>
          </form>
        </div>

        {/* ================= BOTÃO SAIR ================= */}
        <div className="pt-2 pb-8">
          <Button
            type="button"
            onClick={handleLogout}
            variant="outline"
            className="w-full h-12 rounded-full border-[#E5484D]/30 text-[#E5484D] hover:bg-[#E5484D]/10 font-bold text-sm cursor-pointer"
          >
            <LogOut className="w-4 h-4 mr-2" /> Sair da Minha Conta
          </Button>
        </div>
      </div>
    </MainLayout>
  )
}
