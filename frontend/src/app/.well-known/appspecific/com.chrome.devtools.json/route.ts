export function GET(){
  // Chrome blocks automatic workspace access to this XAMPP project under /Applications.
  return Response.json({},{headers:{'Cache-Control':'no-store'}});
}
