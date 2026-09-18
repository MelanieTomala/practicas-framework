interface Props {
  nombre: string;
  correo: string;
}

export default function TarjetaUsuario({ nombre, correo,  }: Props) {
  return (
    <div className="mt-6 p-6 border border-slate-200 rounded-lg bg-white shadow-sm max-w-sm">
      <h2 className="text-xl font-semibold text-slate-900">{nombre}</h2>
      <p className="text-slate-500 mt-1">{correo}</p>
    </div>
  );
}
