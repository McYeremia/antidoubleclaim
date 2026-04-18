import smtplib
import ssl
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

EMAIL_SENDER   = os.getenv("EMAIL_SENDER",   "test.antidoubleclaim@gmail.com")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD",  "pcmsbtzhjobqvugp")
SMTP_HOST      = "smtp.gmail.com"
SMTP_PORT      = 587


def _kirim(to: str, subjek: str, body_html: str):
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[Antidoubleclaim] {subjek}"
        msg["From"]    = f"Antidoubleclaim UKDW <{EMAIL_SENDER}>"
        msg["To"]      = to
        msg.attach(MIMEText(body_html, "html", "utf-8"))

        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls(context=context)
            server.login(EMAIL_SENDER, EMAIL_PASSWORD)
            server.sendmail(EMAIL_SENDER, to, msg.as_string())
        print(f"[Email] ✓ Terkirim ke {to} — {subjek}")
    except Exception as e:
        print(f"[Email] ✗ GAGAL ke {to} — {e}")


def _template(konten: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="id">
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <div style="background:#111;padding:20px 28px;">
      <p style="margin:0;color:white;font-weight:900;font-size:18px;letter-spacing:3px;">ANTIDOUBLECLAIM</p>
      <p style="margin:4px 0 0;color:#6b7280;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Portal Prestasi UKDW</p>
    </div>

    <div style="padding:32px 28px;">
      {konten}
      <hr style="border:none;border-top:1px solid #f3f4f6;margin:28px 0 20px;">
      <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
        Pesan ini dikirim secara otomatis oleh sistem Antidoubleclaim UKDW.<br>
        Mohon tidak membalas email ini.
      </p>
    </div>

  </div>
</body>
</html>"""


# ── Klaim disetujui ───────────────────────────────────────────────────────────
def kirim_email_klaim_disetujui(email: str, nama_lomba: str):
    konten = f"""
      <p style="margin:0 0 20px;font-size:15px;font-weight:bold;color:#16a34a;">✓ Klaim Anda Telah Disetujui</p>
      <p style="margin:0 0 12px;color:#374151;font-size:14px;">Yth. Mahasiswa UKDW,</p>
      <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.6;">
        Klaim sertifikat Anda berikut telah <strong>disetujui</strong> oleh operator dan siap untuk proses reward:
      </p>
      <div style="background:#f9fafb;border-left:4px solid #16a34a;padding:14px 18px;border-radius:6px;margin-bottom:20px;">
        <p style="margin:0;font-size:14px;font-weight:bold;color:#111;">{nama_lomba}</p>
      </div>
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">
        Silakan login ke portal Antidoubleclaim dan buka menu <strong>Konfirmasi Reward</strong>
        untuk mengisi data rekening guna pencairan dana penghargaan.
      </p>
    """
    _kirim(email, f"Klaim Disetujui — {nama_lomba}", _template(konten))


# ── Klaim tidak lolos ─────────────────────────────────────────────────────────
def kirim_email_klaim_tidak_lolos(email: str, nama_lomba: str):
    konten = f"""
      <p style="margin:0 0 20px;font-size:15px;font-weight:bold;color:#dc2626;">✗ Klaim Tidak Lolos Verifikasi</p>
      <p style="margin:0 0 12px;color:#374151;font-size:14px;">Yth. Mahasiswa UKDW,</p>
      <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.6;">
        Klaim sertifikat Anda berikut <strong>tidak lolos</strong> proses verifikasi:
      </p>
      <div style="background:#f9fafb;border-left:4px solid #dc2626;padding:14px 18px;border-radius:6px;margin-bottom:20px;">
        <p style="margin:0;font-size:14px;font-weight:bold;color:#111;">{nama_lomba}</p>
      </div>
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">
        Jika ada pertanyaan atau keberatan, silakan hubungi Divisi Bakat Minat UKDW.
      </p>
    """
    _kirim(email, f"Klaim Tidak Lolos — {nama_lomba}", _template(konten))


# ── Reward: data rekening diterima ────────────────────────────────────────────
def kirim_email_reward_diproses(email: str, nama_lomba: str):
    konten = f"""
      <p style="margin:0 0 20px;font-size:15px;font-weight:bold;color:#2563eb;">📋 Data Rekening Diterima</p>
      <p style="margin:0 0 12px;color:#374151;font-size:14px;">Yth. Mahasiswa UKDW,</p>
      <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.6;">
        Data rekening Anda untuk klaim berikut telah <strong>diterima</strong> dan sedang diproses
        oleh Divisi Bakat Minat:
      </p>
      <div style="background:#f9fafb;border-left:4px solid #2563eb;padding:14px 18px;border-radius:6px;margin-bottom:20px;">
        <p style="margin:0;font-size:14px;font-weight:bold;color:#111;">{nama_lomba}</p>
      </div>
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">
        Dana penghargaan akan segera ditransfer ke rekening yang telah Anda daftarkan.
      </p>
    """
    _kirim(email, f"Data Rekening Diterima — {nama_lomba}", _template(konten))


# ── Reward: dikembalikan ──────────────────────────────────────────────────────
def kirim_email_reward_dikembalikan(email: str, nama_lomba: str, catatan: str = None):
    catatan_html = f"""
      <div style="background:#fff7ed;border-left:4px solid #ea580c;padding:14px 18px;border-radius:6px;margin:16px 0;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:bold;color:#ea580c;text-transform:uppercase;letter-spacing:1px;">Catatan dari Operator:</p>
        <p style="margin:0;font-size:14px;color:#111;line-height:1.6;">{catatan}</p>
      </div>
    """ if catatan else ""

    konten = f"""
      <p style="margin:0 0 20px;font-size:15px;font-weight:bold;color:#ea580c;">⚠ Data Rekening Perlu Diperbaiki</p>
      <p style="margin:0 0 12px;color:#374151;font-size:14px;">Yth. Mahasiswa UKDW,</p>
      <p style="margin:0 0 4px;color:#374151;font-size:14px;line-height:1.6;">
        Data rekening Anda untuk klaim berikut <strong>dikembalikan</strong> dan perlu diperbaiki:
      </p>
      <div style="background:#f9fafb;border-left:4px solid #ea580c;padding:14px 18px;border-radius:6px;margin:16px 0;">
        <p style="margin:0;font-size:14px;font-weight:bold;color:#111;">{nama_lomba}</p>
      </div>
      {catatan_html}
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">
        Silakan login ke portal Antidoubleclaim, buka menu <strong>Konfirmasi Reward</strong>,
        dan perbaiki data sesuai catatan di atas, lalu kirim ulang.
      </p>
    """
    _kirim(email, f"Data Rekening Dikembalikan — {nama_lomba}", _template(konten))


# ── Reward: selesai ───────────────────────────────────────────────────────────
def kirim_email_reward_selesai(email: str, nama_lomba: str):
    konten = f"""
      <p style="margin:0 0 20px;font-size:15px;font-weight:bold;color:#16a34a;">🎉 Reward Telah Dikirim!</p>
      <p style="margin:0 0 12px;color:#374151;font-size:14px;">Yth. Mahasiswa UKDW,</p>
      <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.6;">
        Selamat! Dana penghargaan untuk klaim berikut telah <strong>berhasil ditransfer</strong>
        ke rekening Anda:
      </p>
      <div style="background:#f9fafb;border-left:4px solid #16a34a;padding:14px 18px;border-radius:6px;margin-bottom:20px;">
        <p style="margin:0;font-size:14px;font-weight:bold;color:#111;">{nama_lomba}</p>
      </div>
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">
        Jika dana belum masuk dalam <strong>3 hari kerja</strong>, silakan hubungi Divisi Bakat Minat UKDW.
        Terima kasih atas prestasi Anda!
      </p>
    """
    _kirim(email, f"Reward Dikirim — {nama_lomba}", _template(konten))
