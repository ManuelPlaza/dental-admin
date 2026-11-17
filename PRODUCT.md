# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
La dueña de Técnica Dental JC (técnica dental con más de 10 años de experiencia, Cali) y quien administra el sistema con ella. Lo usan a diario, desde el celular en el local y desde un PC, mientras atienden pacientes. Confirmado por el usuario en la sesión de rediseño (2026-11-17).

## Product Purpose
Panel interno para gestionar la operación del negocio: agenda y citas, pacientes, historias clínicas, pagos, especialistas aliados, servicios, inventario, banners de la landing y el chatbot. El éxito es que la dueña vea qué pasa hoy y resuelva una cita, un pago o un paciente en pocos toques.

## Positioning
Es el panel de un negocio pequeño que combina atención propia con especialistas aliados, conectado a la landing pública de la marca.

## Operating Context
Se despliega en el VPS junto a la landing: https://admin.srv1998971.hstgr.cloud. El backend es una API en Go (`/api/v1`). El módulo de inventario apunta a un microservicio que aún no está desplegado.

## Capabilities and Constraints
- Next.js 14 con Tailwind; Outfit como tipografía.
- Las variables NEXT_PUBLIC_* se incrustan al compilar.
- No presentar al negocio como clínica odontológica ni atribuir a un odontólogo lo que hace la dueña (ver la landing).

## Brand Commitments
Marca Dental JC: azul marino y turquesa, el mismo sistema visual de la landing (fondo claro). Logo en `public/logo-dentaljc.png`.

## Evidence on Hand
No hay capturas ni datos reales anonimizados; los datos vienen de la API.

## Product Principles
- Lo de hoy primero: citas del día y lo que requiere atención antes que el histórico.
- Usable con una mano en el celular, con objetivos táctiles de 44px.
- Un solo vocabulario visual en todas las pantallas.
- Legible con luz de día en el local.

## Accessibility & Inclusion
Contraste AA, foco visible, etiquetas de formulario visibles, interfaz en español.
