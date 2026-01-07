"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { createEmployeeSchema } from "@/lib/hr/schemas";
import {
  HR_EMPLOYEE_STATUSES,
  HR_EMPLOYMENT_TYPES,
  type HrBranch,
  type HrDepartment,
  type HrPosition
} from "@/types/hr";

type FormValues = z.infer<typeof createEmployeeSchema>;

async function fetchBranches(): Promise<HrBranch[]> {
  const res = await fetch("/api/hr/branches", { cache: "no-store" });
  if (!res.ok) return [];
  const payload = await res.json();
  return payload.data || [];
}

async function fetchDepartments(): Promise<HrDepartment[]> {
  const res = await fetch("/api/hr/departments", { cache: "no-store" });
  if (!res.ok) return [];
  const payload = await res.json();
  return payload.data || [];
}

async function fetchPositions(): Promise<HrPosition[]> {
  const res = await fetch("/api/hr/positions", { cache: "no-store" });
  if (!res.ok) return [];
  const payload = await res.json();
  return payload.data || [];
}

export default function NewEmployeePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      hireDate: new Date().toISOString().slice(0, 10),
      employmentType: HR_EMPLOYMENT_TYPES[0],
      status: HR_EMPLOYEE_STATUSES[0]
    }
  });

  const branchesQuery = useQuery({ queryKey: ["hr-branches"], queryFn: fetchBranches });
  const departmentsQuery = useQuery({ queryKey: ["hr-departments"], queryFn: fetchDepartments });
  const positionsQuery = useQuery({ queryKey: ["hr-positions"], queryFn: fetchPositions });

  const loadingCatalogs = branchesQuery.isLoading || positionsQuery.isLoading;

  useEffect(() => {
    if (branchesQuery.data && branchesQuery.data.length && !form.getValues("primaryBranchId")) {
      form.setValue("primaryBranchId", branchesQuery.data[0].id);
    }
  }, [branchesQuery.data, form]);

  useEffect(() => {
    if (positionsQuery.data && positionsQuery.data.length && !form.getValues("positionId")) {
      form.setValue("positionId", positionsQuery.data[0].id);
    }
  }, [positionsQuery.data, form]);

  const onSubmit = async (values: FormValues) => {
    setError(null);
    const payload = { ...values, status: HR_EMPLOYEE_STATUSES[0] };
    const res = await fetch("/api/hr/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err?.error || "No se pudo crear el empleado");
      return;
    }
    const data = await res.json();
    const id = data?.data?.id;
    router.push(id ? `/hr/employees/${id}` : "/hr/employees");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">RRHH</p>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Nuevo empleado</h1>
          <p className="text-sm text-slate-500 mt-1">Datos mínimos para activar a un colaborador.</p>
        </div>
        <Link href="/hr/employees" className="text-sm text-brand-primary hover:underline">
          ← Volver al listado
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos principales</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-slate-600">Nombres</label>
                <input
                  {...form.register("firstName")}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
                {form.formState.errors.firstName && (
                  <p className="text-xs text-rose-600 mt-1">{form.formState.errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-slate-600">Apellidos</label>
                <input
                  {...form.register("lastName")}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
                {form.formState.errors.lastName && (
                  <p className="text-xs text-rose-600 mt-1">{form.formState.errors.lastName.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-slate-600">Código (opcional)</label>
                <input
                  {...form.register("employeeCode")}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  placeholder="EMP-0003"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-slate-600">Fecha de ingreso</label>
                <input
                  type="date"
                  {...form.register("hireDate")}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
                {form.formState.errors.hireDate && (
                  <p className="text-xs text-rose-600 mt-1">{form.formState.errors.hireDate.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-slate-600">Tipo de contratación</label>
                <select
                  {...form.register("employmentType")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                >
                  {HR_EMPLOYMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-600">Sucursal primaria</label>
                <select
                  {...form.register("primaryBranchId")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                >
                  {(branchesQuery.data || []).map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                {form.formState.errors.primaryBranchId && (
                  <p className="text-xs text-rose-600 mt-1">{form.formState.errors.primaryBranchId.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-slate-600">Puesto</label>
                <select
                  {...form.register("positionId")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                >
                  {(positionsQuery.data || []).map((pos) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.name}
                    </option>
                  ))}
                </select>
                {form.formState.errors.positionId && (
                  <p className="text-xs text-rose-600 mt-1">{form.formState.errors.positionId.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-slate-600">Departamento (opcional)</label>
                <select
                  {...form.register("departmentId")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                >
                  <option value="">Sin asignar</option>
                  {(departmentsQuery.data || []).map((dep) => (
                    <option key={dep.id} value={dep.id}>
                      {dep.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-600">Correo (opcional)</label>
                <input
                  type="email"
                  {...form.register("email")}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  placeholder="correo@empresa.com"
                />
                {form.formState.errors.email && (
                  <p className="text-xs text-rose-600 mt-1">{form.formState.errors.email.message as string}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-slate-600">Teléfono</label>
                <input
                  {...form.register("phone")}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  placeholder="+502..."
                />
              </div>
              <div>
                <label className="text-sm text-slate-600">DPI</label>
                <input
                  {...form.register("dpi")}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600">Notas</label>
                <input
                  {...form.register("notes")}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  placeholder="Observaciones internas"
                />
              </div>
            </div>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={form.formState.isSubmitting || loadingCatalogs}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft hover:-translate-y-px transition disabled:opacity-60"
              >
                {form.formState.isSubmitting ? "Guardando..." : loadingCatalogs ? "Cargando catálogos..." : "Crear empleado"}
              </button>
              <p className="text-xs text-slate-500">Se generará un código automático si dejas el campo vacío.</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
