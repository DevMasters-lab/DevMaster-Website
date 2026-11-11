<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        if (AdministratorSeeder::enabled()) {
            $this->call(AdministratorSeeder::class);
        } else {
            $this->call(RolesAndPermissionsSeeder::class);
        }
    }
}
