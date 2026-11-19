<?php

namespace Database\Seeders;

use App\Models\Catalog\DosageForm;
use App\Models\Catalog\Product;
use App\Models\Core\Shop;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {


        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // create permissions
        Permission::create(['name' => 'inventory and stock management']);
        Permission::create(['name' => 'reports and insights management']);
        Permission::create(['name' => 'staff management']);
        Permission::create(['name' => 'view activity logs']); 

        // update cache to know about the newly created permissions (required if using WithoutModelEvents in seeders)
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();




        $adminRole = Role::create(['name' => 'admin']);
        Role::create(['name' => 'manager']);
        Role::create(['name' => 'cashier']);

        $adminRole->syncPermissions(Permission::all()); 
      

        // User A (admin)
        $admin = User::factory()->create([
            'username' => 'admin.admin',
            'firstname' => 'jacob',
            'lastname' => 'athuman',
            'email' => 'benardbenny90@gmail.com',
            'status' => 'active'
        ]);
        $admin->assignRole($adminRole);
        

       
        // SHOP 1
        $shop_1 = Shop::factory()->create();
        $dosageForm_shop_1 = DosageForm::factory(10)->create([
            'shop_id' => $shop_1->id,
        ]);

        Product::factory(10)->create([
            'shop_id' => $shop_1->id,
            'dosage_form_id' => fn () => $dosageForm_shop_1->random()->id,
        ]);

        // SHOP 2
       
        $shop_2 = Shop::factory()->create();
        $dosageForm_shop_2 = DosageForm::factory(10)->create([
            'shop_id' => $shop_2->id,
        ]);
        Product::factory(10)->create([
            'shop_id' => $shop_2->id,
            'dosage_form_id' => fn () => $dosageForm_shop_2->random()->id,
        ]);

    }
}
